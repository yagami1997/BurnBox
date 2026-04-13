export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  applyDefaultHeaders(headers);

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function html(markup, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/html; charset=utf-8");
  }
  applyDefaultHeaders(headers);

  return new Response(markup, {
    ...init,
    headers,
  });
}

export function noContent(init = {}) {
  const headers = new Headers(init.headers || {});
  applyDefaultHeaders(headers);
  return new Response(null, { status: 204, ...init, headers });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function getCookies(request) {
  const header = request.headers.get("cookie") || "";
  const cookies = new Map();

  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    cookies.set(rawName, rawValue.join("="));
  }

  return cookies;
}

export function timingSafeEqual(a, b) {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(String(a || ""));
  const bBytes = encoder.encode(String(b || ""));
  const maxLength = Math.max(aBytes.length, bBytes.length);

  let mismatch = 0;
  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (aBytes[index] || 0) ^ (bBytes[index] || 0);
  }

  return mismatch === 0 && aBytes.length === bBytes.length;
}

function applyDefaultHeaders(headers) {
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "no-store");
  }
  if (!headers.has("x-content-type-options")) {
    headers.set("x-content-type-options", "nosniff");
  }
  if (!headers.has("referrer-policy")) {
    headers.set("referrer-policy", "no-referrer");
  }
  if (!headers.has("x-frame-options")) {
    headers.set("x-frame-options", "DENY");
  }
  if (!headers.has("content-security-policy")) {
    headers.set(
      "content-security-policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'",
    );
  }
  if (!headers.has("strict-transport-security")) {
    headers.set("strict-transport-security", "max-age=63072000; includeSubDomains");
  }
  if (!headers.has("permissions-policy")) {
    headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  }
}

export function withDefaultHeaders(init = {}) {
  const headers = new Headers(init.headers || {});
  applyDefaultHeaders(headers);
  return {
    ...init,
    headers,
  };
}
