import { getCookies, timingSafeEqual } from "./http.js";

const COOKIE_NAME = "burnbox_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

export async function createSession(env) {
  const payload = {
    sub: "admin",
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
    nonce: crypto.randomUUID(),
  };

  const payloadEncoded = encodeBase64Url(JSON.stringify(payload));
  const signature = await sign(env.SESSION_SECRET, payloadEncoded);
  const token = `${payloadEncoded}.${signature}`;

  return {
    token,
    cookie: serializeCookie(COOKIE_NAME, token, SESSION_TTL_SECONDS),
  };
}

export async function readSession(request, env) {
  const cookies = getCookies(request);
  const token = cookies.get(COOKIE_NAME);
  if (!token) {
    return null;
  }

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return null;
  }

  const expectedSignature = await sign(env.SESSION_SECRET, payloadEncoded);
  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  const payload = JSON.parse(decodeBase64Url(payloadEncoded));
  if (payload.expiresAt <= Date.now()) {
    return null;
  }

  return payload;
}

export function clearSessionCookie() {
  return serializeCookie(COOKIE_NAME, "", 0);
}

function serializeCookie(name, value, maxAge) {
  return [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

async function sign(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return encodeBase64Url(signature);
}

function encodeBase64Url(input) {
  const bytes = typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
