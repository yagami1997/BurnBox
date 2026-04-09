import { recordAuditLog } from "./lib/audit.js";
import { completeUpload, createUploadPlan, deleteFile, uploadFilePart } from "./lib/files.js";
import { html, json, noContent, readJson, timingSafeEqual } from "./lib/http.js";
import { renderAppPage } from "./lib/layout.js";
import { listFiles } from "./lib/repository.js";
import { createShare, resolveShareForDownload, revokeShare } from "./lib/shares.js";
import { clearSessionCookie, createSession, readSession } from "./lib/session.js";

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      console.error(error);
      return json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);
  const session = await readSession(request, env);

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

    const share = await createShare(env, { fileId, expiresInHours, maxDownloads });
    if (!share) {
      return json({ error: "File not found" }, { status: 404 });
    }

    const shareUrl = `${url.origin}/s/${share.token}`;
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
      },
      shareUrl,
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

  if (request.method === "GET" && url.pathname.startsWith("/s/")) {
    const token = url.pathname.replace("/s/", "").trim();
    if (!token) {
      return html("<h1>Invalid share link</h1>", { status: 400 });
    }

    const result = await resolveShareForDownload(env, token);
    if (result.status !== "ready") {
      return renderShareError(result.status);
    }

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

  return json({ error: "Not found" }, { status: 404 });
}

function renderShareError(status) {
  const copy = {
    missing: { title: "Share not found", description: "This link does not exist." },
    revoked: { title: "Share revoked", description: "The owner has revoked this link." },
    expired: { title: "Share expired", description: "This temporary link has expired." },
    depleted: { title: "Download limit reached", description: "This link has no remaining downloads." },
    missing_object: { title: "File unavailable", description: "The storage backend is missing the object for this share." },
    unavailable: { title: "Share unavailable", description: "This share cannot be used right now. Please try again." },
  }[status] || { title: "Unavailable", description: "This share cannot be used right now." };

  return html(
    `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${copy.title}</title>
          <style>
            :root {
              --ink: #1d150f;
              --muted: #6f5d4a;
              --line: rgba(50, 32, 16, 0.12);
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              background:
                radial-gradient(circle at top left, rgba(197, 75, 26, 0.18), transparent 30%),
                radial-gradient(circle at bottom right, rgba(79, 98, 84, 0.16), transparent 30%),
                linear-gradient(180deg, #ece4d5, #f7f1e7);
              color: var(--ink);
              font-family: Georgia, "Times New Roman", serif;
            }
            article {
              width: min(680px, calc(100% - 28px));
              padding: 30px;
              border-radius: 32px;
              background:
                linear-gradient(180deg, rgba(255, 252, 247, 0.96), rgba(247, 240, 230, 0.94));
              border: 1px solid var(--line);
              box-shadow: 0 28px 90px rgba(79,46,17,.14);
            }
            .eyebrow {
              display: inline-flex;
              padding: 9px 14px;
              border-radius: 999px;
              border: 1px solid var(--line);
              color: var(--muted);
              letter-spacing: .12em;
              text-transform: uppercase;
              font-size: .78rem;
            }
            h1 {
              margin: 22px 0 12px;
              font-size: clamp(2.2rem, 8vw, 4.6rem);
              line-height: .9;
              letter-spacing: -.05em;
            }
            p {
              margin: 0;
              color: var(--muted);
              font-size: 1.06rem;
              line-height: 1.45;
              max-width: 520px;
            }
          </style>
        </head>
        <body>
          <article>
            <div class="eyebrow">BurnBox Share</div>
            <h1>${copy.title}</h1>
            <p>${copy.description}</p>
          </article>
        </body>
      </html>`,
    { status: status === "missing" ? 404 : status === "missing_object" || status === "unavailable" ? 503 : 410 },
  );
}


function contentDisposition(filename) {
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename*=UTF-8''${encoded}`;
}
