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
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

function applyDefaultHeaders(headers) {
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "no-store");
  }
  if (!headers.has("x-content-type-options")) {
    headers.set("x-content-type-options", "nosniff");
  }
  if (!headers.has("referrer-policy")) {
    headers.set("referrer-policy", "same-origin");
  }
}
