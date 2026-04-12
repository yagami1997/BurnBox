import { recordAuditLog } from "./lib/audit.js";
import { completeUpload, createUploadPlan, deleteFile, uploadFilePart } from "./lib/files.js";
import { html, json, noContent, readJson, timingSafeEqual } from "./lib/http.js";
import { renderAppPage } from "./lib/layout.js";
import { listFiles } from "./lib/repository.js";
import { renderPublicHostUnavailablePage, renderShareErrorPage } from "./lib/share-pages.js";
import {
  createShare,
  resolveShareForDownload,
  resolveShareForDownloadByPublicHandle,
  resolveShareForView,
  resolveShareForViewByPublicHandle,
  revokeShare,
} from "./lib/shares.js";
import { clearSessionCookie, createSession, readSession } from "./lib/session.js";

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      console.error(error);
      if (isPublicFacingHost(request, env)) {
        return html(renderPublicHostUnavailablePage({ status: 503 }), { status: 503 });
      }
      return json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);
  const host = (request.headers.get("host") || url.hostname || "").toLowerCase();
  const appHosts = parseHostList(env.ALLOWED_APP_HOSTS);
  const shareHosts = parseHostList(env.ALLOWED_SHARE_HOSTS);
  const shareSubdomainBaseDomain = getShareSubdomainBaseDomain(env, url);
  const sharePublicHandle = extractSharePublicHandleFromHost(host, shareSubdomainBaseDomain);
  const isShareSubdomainHost = Boolean(sharePublicHandle);
  const sharePublicHandlePath = !isShareSubdomainHost ? extractSharePublicHandleFromPath(url.pathname, { download: false }) : "";
  const sharePublicHandleDownloadPath = !isShareSubdomainHost ? extractSharePublicHandleFromPath(url.pathname, { download: true }) : "";
  const isKnownAppHost = appHosts.has(host);
  const isKnownShareHost = shareHosts.has(host);
  const isPublicHost = isKnownShareHost || isShareSubdomainHost;
  const isApiPath = url.pathname.startsWith("/api/");
  const isAppSurfacePath = request.method === "GET" && url.pathname === "/";
  const isShareRoute = url.pathname === "/h"
    || url.pathname === "/h/"
    || url.pathname.startsWith("/h/")
    || url.pathname.startsWith("/s/")
    || url.pathname === "/download";
  const session = await readSession(request, env);

  if (isPublicHost && isApiPath) {
    return notFoundForRequest(request);
  }

  if (!isKnownAppHost && !isPublicHost) {
    return renderPublicFallbackForRequest(request, 404);
  }

  if (isKnownShareHost && isAppSurfacePath && !isShareSubdomainHost) {
    return html(renderPublicHostUnavailablePage({ status: 503 }), { status: 503 });
  }

  if (isPublicHost && request.method === "GET" && isMalformedSharePublicHandlePath(url.pathname)) {
    return html(renderPublicHostUnavailablePage({ status: 404 }), { status: 404 });
  }

  if (!isPublicHost && isShareRoute) {
    return notFoundForRequest(request);
  }

  if (request.method === "GET" && url.pathname === "/") {
    const files = session ? await listFiles(env) : [];
    return html(renderAppPage({ authenticated: Boolean(session), files }));
  }

  if (request.method === "GET" && url.pathname === "/api/auth/session") {
    return json({ authenticated: Boolean(session) });
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJson(request);
    if (!body?.password) {
      return json({ error: "Password is required" }, { status: 400 });
    }

    if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
      return json({ error: "Worker secret configuration is incomplete" }, { status: 500 });
    }

    if (!timingSafeEqual(String(body.password || ""), String(env.ADMIN_PASSWORD || ""))) {
      return json({ error: "Invalid password" }, { status: 401 });
    }

    const sessionData = await createSession(env);
    return json(
      { success: true },
      {
        headers: { "set-cookie": sessionData.cookie },
      },
    );
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    return noContent({
      headers: {
        "set-cookie": clearSessionCookie(),
      },
    });
  }

  if (request.method === "GET" && url.pathname === "/api/files") {
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await listFiles(env);
    return json({ files });
  }

  if (request.method === "POST" && url.pathname === "/api/files/init-upload") {
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await readJson(request);
    if (!body?.filename || !body?.size) {
      return json({ error: "filename and size are required" }, { status: 400 });
    }

    let uploadPlan;
    try {
      uploadPlan = await createUploadPlan(env, {
        filename: body.filename,
        size: Number(body.size),
        contentType: body.contentType || "application/octet-stream",
      });
    } catch (error) {
      if (String(error?.message || "").includes("upload_plans migration")) {
        return json({ error: error.message }, { status: 500 });
      }
      if (String(error?.message || "").includes("multipart upload migration")) {
        return json({ error: error.message }, { status: 500 });
      }
      throw error;
    }

    await recordAuditLog(env, {
      actor: session.sub,
      action: "file.upload_initialized",
      targetType: "file",
      targetId: uploadPlan.fileId,
      meta: {
        filename: body.filename,
        storageKey: uploadPlan.storageKey,
      },
    });

    return json(uploadPlan);
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/files/") && url.pathname.endsWith("/upload-part")) {
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const fileId = url.pathname.replace("/api/files/", "").replace("/upload-part", "").replace(/\/$/, "");
    const partNumber = Number(url.searchParams.get("partNumber"));

    if (!fileId) {
      return json({ error: "File id is required" }, { status: 400 });
    }
    if (!Number.isInteger(partNumber) || partNumber <= 0) {
      return json({ error: "partNumber must be a positive integer" }, { status: 400 });
    }

    const chunkBody = await request.arrayBuffer();
    if (!chunkBody.byteLength) {
      return json({ error: "Chunk body is required" }, { status: 400 });
    }
    if (chunkBody.byteLength > 6 * 1024 * 1024) {
      return json({ error: "Chunk exceeds maximum allowed size" }, { status: 413 });
    }

    let uploadedPart;
    try {
      uploadedPart = await uploadFilePart(env, {
        fileId,
        partNumber,
        body: chunkBody,
      });
    } catch (error) {
      const message = String(error?.message || "");
      if (message === "Upload plan was not found or has already been completed") {
        return json({ error: message }, { status: 409 });
      }
      if (message.includes("multipart upload migration")) {
        return json({ error: message }, { status: 500 });
      }
      if (message.includes("partNumber must be")) {
        return json({ error: message }, { status: 400 });
      }
      throw error;
    }

    return json(uploadedPart, { status: 201 });
  }

  if (request.method === "POST" && url.pathname === "/api/files/complete-upload") {
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await readJson(request);
    if (!body?.fileId) {
      return json({ error: "fileId is required" }, { status: 400 });
    }

    let file;
    try {
      file = await completeUpload(env, {
        fileId: body.fileId,
        tags: body.tags,
        note: body.note,
      });
    } catch (error) {
      const message = String(error?.message || "");
      if (message === "Upload plan was not found or has already been completed") {
        return json({ error: message }, { status: 409 });
      }
      if (message === "Upload is incomplete") {
        return json({ error: message }, { status: 409 });
      }
      if (message.includes("upload_plans migration")) {
        return json({ error: message }, { status: 500 });
      }
      if (message.includes("multipart upload migration")) {
        return json({ error: message }, { status: 500 });
      }
      throw error;
    }

    await recordAuditLog(env, {
      actor: session.sub,
      action: "file.upload_completed",
      targetType: "file",
      targetId: file.id,
      meta: {
        storageKey: file.storageKey,
        size: file.size,
      },
    });

    return json({ file }, { status: 201 });
  }

  if (request.method === "DELETE" && url.pathname.startsWith("/api/files/")) {
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const fileId = url.pathname.replace("/api/files/", "");
    if (!fileId) {
      return json({ error: "File id is required" }, { status: 400 });
    }

    const deleted = await deleteFile(env, fileId);
    if (!deleted) {
      return json({ error: "File not found" }, { status: 404 });
    }

    await recordAuditLog(env, {
      actor: session.sub,
      action: "file.deleted",
      targetType: "file",
      targetId: deleted.id,
      meta: {
        storageKey: deleted.storageKey,
      },
    });

    return json({ success: true });
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/files/") && url.pathname.endsWith("/shares")) {
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const fileId = url.pathname.replace("/api/files/", "").replace("/shares", "").replace(/\/$/, "");
    const body = await readJson(request);
    const expiresInHours = body?.expiresInHours === null || body?.expiresInHours === ""
      ? null
      : Number(body?.expiresInHours);
    const maxDownloads = body?.maxDownloads === null || body?.maxDownloads === "" ? null : Number(body?.maxDownloads);

    if (!fileId) {
      return json({ error: "File id is required" }, { status: 400 });
    }
    if (expiresInHours !== null && (!Number.isFinite(expiresInHours) || expiresInHours <= 0 || expiresInHours > 24 * 30)) {
      return json({ error: "expiresInHours must be between 1 and 720" }, { status: 400 });
    }
    if (maxDownloads !== null && (!Number.isInteger(maxDownloads) || maxDownloads <= 0 || maxDownloads > 1000)) {
      return json({ error: "maxDownloads must be a positive integer or null" }, { status: 400 });
    }

    let share;
    try {
      share = await createShare(env, { fileId, expiresInHours, maxDownloads });
    } catch (error) {
      if (String(error?.message || "").includes("public_handle migration")) {
        return json({ error: error.message }, { status: 500 });
      }
      throw error;
    }
    if (!share) {
      return json({ error: "File not found" }, { status: 404 });
    }
    if (!share.publicHandle) {
      return json({ error: "Share handle generation failed" }, { status: 500 });
    }

    const shareUrls = buildShareUrls(env, url, share);
    await recordAuditLog(env, {
      actor: session.sub,
      action: "share.created",
      targetType: "share",
      targetId: share.id,
      meta: {
        fileId: share.fileId,
        expiresAt: share.expiresAt,
        maxDownloads: share.maxDownloads,
      },
    });

    return json({
      share: {
        id: share.id,
        fileId: share.fileId,
        expiresAt: share.expiresAt,
        maxDownloads: share.maxDownloads,
        downloadCount: share.downloadCount,
        publicHandle: share.publicHandle,
      },
      shareUrl: shareUrls.shareUrl,
      sharePathUrl: shareUrls.sharePathUrl,
      shareSubdomainUrl: shareUrls.shareSubdomainUrl,
    }, { status: 201 });
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/shares/") && url.pathname.endsWith("/revoke")) {
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const shareId = url.pathname.replace("/api/shares/", "").replace("/revoke", "").replace(/\/$/, "");
    if (!shareId) {
      return json({ error: "Share id is required" }, { status: 400 });
    }

    const revoked = await revokeShare(env, shareId);
    if (revoked.status === "missing") {
      return json({ error: "Share not found" }, { status: 404 });
    }
    if (revoked.status === "already_revoked") {
      return json({ error: "Share is already revoked" }, { status: 409 });
    }

    await recordAuditLog(env, {
      actor: session.sub,
      action: "share.revoked",
      targetType: "share",
      targetId: shareId,
    });

    return json({ success: true });
  }

  if (request.method === "GET" && (
    (!isShareSubdomainHost && url.pathname.startsWith("/s/") && url.pathname.endsWith("/download"))
    || (!isShareSubdomainHost && sharePublicHandleDownloadPath)
    || (isShareSubdomainHost && url.pathname === "/download")
  )) {
    const locator = isShareSubdomainHost
      ? { type: "public_handle", value: sharePublicHandle }
      : sharePublicHandleDownloadPath
        ? { type: "public_handle", value: sharePublicHandleDownloadPath }
        : { type: "token", value: extractShareToken(url.pathname, { download: true }) };
    if (!locator.value) {
      return html(renderPublicHostUnavailablePage({ status: 404 }), { status: 404 });
    }

    const ts = Number(url.searchParams.get("ts"));
    const sig = url.searchParams.get("sig") || "";
    const signatureValid = await validateShareDownloadSignature(env, locator.type, locator.value, ts, sig);
    if (!signatureValid) {
      return renderShareError("unavailable");
    }

    const result = locator.type === "public_handle"
      ? await resolveShareForDownloadByPublicHandle(env, locator.value)
      : await resolveShareForDownload(env, locator.value);
    if (result.status !== "ready") {
      return renderShareError(result.status);
    }

    await recordAuditLog(env, {
      actor: "share_guest",
      action: "share.downloaded",
      targetType: "share",
      targetId: result.share.id,
      meta: {
        fileId: result.share.file_id,
        via: locator.type,
        publicHandle: result.share.public_handle || null,
        host,
      },
    });

    const headers = new Headers();
    headers.set("content-type", result.share.content_type || "application/octet-stream");
    headers.set("content-disposition", contentDisposition(result.share.filename));
    headers.set("cache-control", "private, no-store");
    headers.set("x-content-type-options", "nosniff");

    return new Response(result.object.body, {
      status: 200,
      headers,
    });
  }

  if (request.method === "GET" && (
    (!isShareSubdomainHost && url.pathname.startsWith("/s/"))
    || (!isShareSubdomainHost && sharePublicHandlePath)
    || (isShareSubdomainHost && url.pathname === "/")
  )) {
    const locator = isShareSubdomainHost
      ? { type: "public_handle", value: sharePublicHandle }
      : sharePublicHandlePath
        ? { type: "public_handle", value: sharePublicHandlePath }
        : { type: "token", value: extractShareToken(url.pathname, { download: false }) };
    if (!locator.value) {
      return html(renderPublicHostUnavailablePage({ status: 404 }), { status: 404 });
    }

    const result = locator.type === "public_handle"
      ? await resolveShareForViewByPublicHandle(env, locator.value)
      : await resolveShareForView(env, locator.value);
    if (result.status !== "ready") {
      return renderShareError(result.status);
    }

    const downloadParams = await createShareDownloadParams(env, locator.type, locator.value);
    const downloadPath = locator.type === "public_handle"
      ? (isShareSubdomainHost ? `/download` : `/h/${encodeURIComponent(locator.value)}/download`)
      : `/s/${encodeURIComponent(locator.value)}/download`;
    const downloadUrl = `${downloadPath}?ts=${encodeURIComponent(downloadParams.ts)}&sig=${encodeURIComponent(downloadParams.sig)}`;
    return Response.redirect(new URL(downloadUrl, url), 302);
  }

  if (isPublicHost) {
    return html(renderPublicHostUnavailablePage({ status: 404 }), { status: 404 });
  }

  return json({ error: "Not found" }, { status: 404 });
}

function normalizeBaseUrl(value) {
  if (!value) return null;
  return String(value).trim().replace(/\/+$/, "");
}

function parseHostList(value) {
  if (!value) return new Set();

  return new Set(
    String(value)
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isPublicFacingHost(request, env) {
  const url = new URL(request.url);
  const host = (request.headers.get("host") || url.hostname || "").toLowerCase();
  const shareHosts = parseHostList(env.ALLOWED_SHARE_HOSTS);
  const shareSubdomainBaseDomain = getShareSubdomainBaseDomain(env, url);
  return shareHosts.has(host) || Boolean(extractSharePublicHandleFromHost(host, shareSubdomainBaseDomain));
}

function notFoundForRequest(request) {
  if ((request.headers.get("accept") || "").includes("text/html")) {
    return html("<h1>Not found</h1>", { status: 404 });
  }

  return json({ error: "Not found" }, { status: 404 });
}

function renderShareError(status) {
  return html(renderShareErrorPage(status), {
    status: status === "missing" ? 404 : status === "missing_object" || status === "unavailable" ? 503 : 410,
  });
}

function renderPublicFallbackForRequest(request, status = 404) {
  if (request.method === "GET" || request.method === "HEAD") {
    return html(renderPublicHostUnavailablePage({ status }), { status });
  }

  return json({ error: "Not found" }, { status: 404 });
}

async function createShareDownloadParams(env, locatorType, locatorValue) {
  const ts = String(Date.now());
  const sig = await signShareDownload(env, `${locatorType}:${locatorValue}`, ts);
  return { ts, sig };
}

async function validateShareDownloadSignature(env, locatorType, locatorValue, ts, sig) {
  if (!Number.isFinite(ts) || ts <= 0 || !sig) {
    return false;
  }

  const age = Math.abs(Date.now() - ts);
  if (age > 5 * 60 * 1000) {
    return false;
  }

  const expected = await signShareDownload(env, `${locatorType}:${locatorValue}`, String(ts));
  return timingSafeEqual(expected, sig);
}

async function signShareDownload(env, locatorValue, ts) {
  const secret = String(env.SHARE_LINK_SECRET || env.SESSION_SECRET || "");
  if (!secret) {
    throw new Error("Worker secret configuration is incomplete");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = new TextEncoder().encode(`${locatorValue}:${ts}`);
  const signature = await crypto.subtle.sign("HMAC", key, payload);
  return encodeBase64Url(new Uint8Array(signature));
}

function buildShareUrls(env, url, share) {
  const shareBaseUrl = normalizeBaseUrl(env.SHARE_BASE_URL) || url.origin;
  const sharePathUrl = `${shareBaseUrl}/h/${share.publicHandle}`;
  const shareLegacyTokenUrl = `${shareBaseUrl}/s/${share.token}`;
  const subdomainBaseDomain = getShareSubdomainBaseDomain(env, url);
  const shareSubdomainUrl = subdomainBaseDomain
    ? `https://${share.publicHandle}.${subdomainBaseDomain}`
    : null;

  return {
    shareUrl: shareSubdomainUrl || sharePathUrl,
    sharePathUrl,
    shareLegacyTokenUrl,
    shareSubdomainUrl,
  };
}

function getShareSubdomainBaseDomain(env, url) {
  if (env.SHARE_SUBDOMAIN_BASE_DOMAIN) {
    return String(env.SHARE_SUBDOMAIN_BASE_DOMAIN).trim().toLowerCase();
  }
  return "";
}

function extractSharePublicHandleFromHost(host, baseDomain) {
  if (!host || !baseDomain || host === baseDomain) {
    return "";
  }

  const suffix = `.${baseDomain}`;
  if (!host.endsWith(suffix)) {
    return "";
  }

  const label = host.slice(0, -suffix.length);
  if (!label || label.includes(".")) {
    return "";
  }

  return label;
}

function extractShareToken(pathname, options = {}) {
  if (!pathname.startsWith("/s/")) return "";

  const remainder = pathname.slice(3);
  if (!remainder) return "";

  if (options.download) {
    if (!remainder.endsWith("/download")) return "";
    return remainder.slice(0, -"/download".length).replace(/\/+$/, "").trim();
  }

  return remainder.split("/")[0].trim();
}

function extractSharePublicHandleFromPath(pathname, options = {}) {
  if (!pathname.startsWith("/h/")) return "";

  const remainder = pathname.slice(3);
  if (!remainder) return "";

  if (options.download) {
    if (!remainder.endsWith("/download")) return "";
    return remainder.slice(0, -"/download".length).replace(/\/+$/, "").trim();
  }

  return remainder.split("/")[0].trim();
}

function isMalformedSharePublicHandlePath(pathname) {
  if (pathname === "/h" || pathname === "/h/") {
    return true;
  }

  if (!pathname.startsWith("/h/")) {
    return false;
  }

  return !/^\/h\/[^/]+(?:\/download)?\/?$/.test(pathname);
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}


function contentDisposition(filename) {
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename*=UTF-8''${encoded}`;
}
