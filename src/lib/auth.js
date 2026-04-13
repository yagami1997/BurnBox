import { timingSafeEqual } from "./http.js";

const OWNER_ID = "owner";
const CLAIM_TTL_HOURS = 24;
const RECOVERY_CODE_COUNT = 8;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 1024;
const LOGIN_LOCK_THRESHOLD = 8;
const LOGIN_LOCK_MINUTES = 30;
const CLAIM_LOCK_THRESHOLD = 5;
const CLAIM_FAILURE_WINDOW_MINUTES = 30;
const CLAIM_LOCK_MINUTES = 30;
const RECOVERY_LOCK_THRESHOLD = 5;
const RECOVERY_FAILURE_WINDOW_MINUTES = 30;
const RECOVERY_LOCK_MINUTES = 30;
const LEGACY_LOGIN_WINDOW_MINUTES = 15;
const LEGACY_LOGIN_THRESHOLD = 10;
const PASSWORD_HASH_ITERATIONS = 100_000;
const PASSWORD_HASH_ITERATIONS_MIN = 100_000;
const PASSWORD_HASH_ITERATIONS_MAX = 10_000_000;

export async function getAuthState(env) {
  const owner = await getOwnerAccount(env);
  if (owner) {
    return { state: "active", owner: sanitizeOwner(owner), claimCodeRequired: false };
  }

  if (String(env.ADMIN_PASSWORD || "")) {
    return { state: "upgrade_required", owner: null, claimCodeRequired: false };
  }

  await ensureClaimToken(env);
  return { state: "unclaimed", owner: null, claimCodeRequired: true };
}

export async function getOwnerAccount(env) {
  if (!env.DB) {
    return null;
  }

  try {
    const row = await env.DB.prepare(
      `select
         id,
         email,
         recovery_email,
         password_hash,
         password_algo,
         password_updated_at,
         workspace_claimed_at,
         email_otp_enabled,
         last_login_at,
         last_login_ip,
         failed_login_count,
         locked_until,
         session_version,
         created_at,
         updated_at
       from owner_account
       where id = ?
       limit 1`,
    ).bind(OWNER_ID).first();

    return row ? mapOwnerRow(row) : null;
  } catch (error) {
    throwAuthMigrationError(error);
  }
}

export async function ensureClaimToken(env) {
  if (!env.DB) {
    return;
  }

  if (String(env.CLAIM_KEY || "")) {
    return;
  }

  try {
    const active = await env.DB.prepare(
      `select id
       from claim_tokens
       where used_at is null
         and expires_at > ?
       limit 1`,
    ).bind(nowIso()).first();

    if (active) {
      return;
    }

    const claimCode = `claim_${randomToken(12)}`;
    const createdAt = nowIso();
    const expiresAt = isoAfterHours(CLAIM_TTL_HOURS);
    await env.DB.prepare(
      `insert into claim_tokens (id, token_hash, source, expires_at, used_at, created_at)
       values (?, ?, ?, ?, null, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        await sha256Text(claimCode),
        "generated",
        expiresAt,
        createdAt,
      )
      .run();

    console.log([
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "BurnBox is ready — workspace unclaimed",
      "",
      "Visit / to claim this workspace.",
      `One-time claim code: ${claimCode}`,
      `Expires at: ${expiresAt}`,
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ].join("\n"));
  } catch (error) {
    throwAuthMigrationError(error);
  }
}

export async function claimOwner(env, input) {
  const existingOwner = await getOwnerAccount(env);
  if (existingOwner) {
    throw new Error("Workspace has already been claimed");
  }

  await assertValidEmail(input.email);
  assertValidPassword(input.password);

  const claimResult = await verifyClaimCode(env, input.claimCode, {
    clientIp: input.clientIp || null,
  });
  if (!claimResult.ok) {
    throw new Error("Invalid claim code");
  }

  const owner = await createOwnerAccount(env, {
    email: input.email,
    recoveryEmail: input.recoveryEmail || null,
    password: input.password,
    clientIp: input.clientIp || null,
    eventType: "claim_completed",
    claimTokenId: claimResult.claimTokenId || null,
  });

  return owner;
}

export async function upgradeLegacyOwner(env, input) {
  const existingOwner = await getOwnerAccount(env);
  if (existingOwner) {
    throw new Error("Workspace upgrade is already complete");
  }

  await assertValidEmail(input.email);
  assertValidPassword(input.password);

  return createOwnerAccount(env, {
    email: input.email,
    recoveryEmail: input.recoveryEmail || null,
    password: input.password,
    clientIp: input.clientIp || null,
    eventType: "upgrade_completed",
  });
}

export async function authenticateLegacyPassword(env, password, context = {}) {
  const recentFailures = await getRecentLegacyLoginFailureCount(env, context.clientIp || null);
  if (recentFailures >= LEGACY_LOGIN_THRESHOLD) {
    const retryAfter = LEGACY_LOGIN_WINDOW_MINUTES * 60;
    await recordAuthEvent(env, {
      eventType: "legacy_login_rate_limited",
      success: false,
      ...context,
      detail: { reason: "too_many_attempts" },
    });
    return { ok: false, error: "Too many login attempts", retryAfter };
  }

  const configured = String(env.ADMIN_PASSWORD || "");
  if (!configured) {
    await recordAuthEvent(env, {
      eventType: "legacy_login_failed",
      success: false,
      ...context,
      detail: { reason: "invalid_credentials" },
    });
    return { ok: false, error: "Legacy admin password is not configured" };
  }

  const ok = timingSafeEqual(String(password || ""), configured);
  await recordAuthEvent(env, {
    eventType: ok ? "legacy_login_success" : "legacy_login_failed",
    success: ok,
    ...context,
    detail: ok ? null : { reason: "invalid_credentials" },
  });
  return ok
    ? { ok: true }
    : { ok: false, error: "Invalid password" };
}

export async function authenticateOwner(env, input) {
  const owner = await getOwnerAccount(env);
  if (!owner) {
    return { ok: false, error: "Owner account was not found" };
  }

  if (owner.lockedUntil && Date.parse(owner.lockedUntil) > Date.now()) {
    await recordAuthEvent(env, {
      eventType: "login_failed",
      success: false,
      ip: input.clientIp,
      country: input.clientCountry,
      userAgent: input.userAgent,
      detail: { reason: "locked", lockedUntil: owner.lockedUntil },
    });
    return { ok: false, error: "Account temporarily locked", lockedUntil: owner.lockedUntil };
  }

  const emailMatches = normalizeEmail(input.email) === normalizeEmail(owner.email);
  const passwordMatches = emailMatches && await verifyPassword(String(input.password || ""), owner.passwordHash);

  if (!passwordMatches) {
    const nextFailedCount = owner.failedLoginCount + 1;
    const lockedUntil = nextFailedCount >= LOGIN_LOCK_THRESHOLD ? isoAfterMinutes(LOGIN_LOCK_MINUTES) : null;
    await env.DB.prepare(
      `update owner_account
       set failed_login_count = ?, locked_until = ?, updated_at = ?
       where id = ?`,
    ).bind(nextFailedCount, lockedUntil, nowIso(), owner.id).run();

    await recordAuthEvent(env, {
      eventType: "login_failed",
      success: false,
      ip: input.clientIp,
      country: input.clientCountry,
      userAgent: input.userAgent,
      detail: { reason: "invalid_credentials", lockedUntil },
    });

    return {
      ok: false,
      error: lockedUntil ? "Account temporarily locked" : "Invalid email or password",
      lockedUntil,
    };
  }

  const updatedAt = nowIso();
  await env.DB.prepare(
    `update owner_account
     set failed_login_count = 0,
         locked_until = null,
         last_login_at = ?,
         last_login_ip = ?,
         updated_at = ?
     where id = ?`,
  ).bind(updatedAt, input.clientIp || null, updatedAt, owner.id).run();

  await recordAuthEvent(env, {
    eventType: "login_success",
    success: true,
    ip: input.clientIp,
    country: input.clientCountry,
    userAgent: input.userAgent,
    detail: { ownerId: owner.id },
  });

  return { ok: true, owner: sanitizeOwner(await getOwnerAccount(env)) };
}

export async function changeOwnerPassword(env, ownerId, input) {
  const owner = await getOwnerAccount(env);
  if (!owner || owner.id !== ownerId) {
    throw new Error("Owner account was not found");
  }

  const currentValid = await verifyPassword(String(input.currentPassword || ""), owner.passwordHash);
  if (!currentValid) {
    throw new Error("Current password is incorrect");
  }

  assertValidPassword(input.newPassword);
  const passwordHash = await hashPassword(input.newPassword);
  const updatedAt = nowIso();
  const nextVersion = owner.sessionVersion + 1;

  await env.DB.prepare(
    `update owner_account
     set password_hash = ?,
         password_algo = ?,
         password_updated_at = ?,
         failed_login_count = 0,
         locked_until = null,
         session_version = ?,
         updated_at = ?
     where id = ?`,
  ).bind(passwordHash, "pbkdf2_sha256", updatedAt, nextVersion, updatedAt, owner.id).run();

  await recordAuthEvent(env, {
    eventType: "password_changed",
    success: true,
    ip: input.clientIp,
    country: input.clientCountry,
    userAgent: input.userAgent,
    detail: { ownerId: owner.id },
  });

  return sanitizeOwner(await getOwnerAccount(env));
}

export async function updateRecoveryEmail(env, ownerId, input) {
  const owner = await getOwnerAccount(env);
  if (!owner || owner.id !== ownerId) {
    throw new Error("Owner account was not found");
  }

  const currentValid = await verifyPassword(String(input.currentPassword || ""), owner.passwordHash);
  if (!currentValid) {
    throw new Error("Current password is incorrect");
  }

  const recoveryEmail = String(input.recoveryEmail || "").trim();
  if (recoveryEmail) {
    await assertValidEmail(recoveryEmail);
  }

  await env.DB.prepare(
    `update owner_account
     set recovery_email = ?,
         updated_at = ?
     where id = ?`,
  ).bind(
    recoveryEmail ? normalizeEmail(recoveryEmail) : null,
    nowIso(),
    owner.id,
  ).run();

  await recordAuthEvent(env, {
    eventType: "recovery_email_updated",
    success: true,
    ip: input.clientIp,
    country: input.clientCountry,
    userAgent: input.userAgent,
    detail: {
      ownerId: owner.id,
      recoveryEmailSet: Boolean(recoveryEmail),
    },
  });

  return sanitizeOwner(await getOwnerAccount(env));
}

export async function regenerateRecoveryCodes(env, ownerId, currentPassword, context = {}) {
  const owner = await getOwnerAccount(env);
  if (!owner || owner.id !== ownerId) {
    throw new Error("Owner account was not found");
  }

  const valid = await verifyPassword(String(currentPassword || ""), owner.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect");
  }

  const recoveryCodes = await replaceRecoveryCodes(env, owner.id);
  await recordAuthEvent(env, {
    eventType: "recovery_codes_regenerated",
    success: true,
    ...context,
    detail: { ownerId: owner.id },
  });
  return recoveryCodes;
}

export async function resetPasswordWithRecoveryCode(env, input) {
  const owner = await getOwnerAccount(env);
  assertValidPassword(input.newPassword);

  const ownerId = owner?.id || OWNER_ID;
  const lockedUntil = await getRecoveryLockUntil(env, ownerId);
  if (lockedUntil) {
    throw new Error("Recovery path temporarily locked");
  }

  const normalizedEmail = normalizeEmail(input.email);
  const codeHash = await sha256Text(String(input.recoveryCode || "").trim().toUpperCase());
  const lookupOwnerId = owner?.id || OWNER_ID;
  const codeRow = await env.DB.prepare(
    `select id
     from recovery_codes
     where owner_id = ?
       and code_hash = ?
       and used_at is null
     limit 1`,
  ).bind(lookupOwnerId, codeHash).first();

  const validOwner = Boolean(owner);
  const emailMatches = validOwner && normalizedEmail === normalizeEmail(owner.email);
  const codeMatches = Boolean(codeRow);

  if (!validOwner || !emailMatches || !codeMatches) {
    const failureCount = (await countRecentRecoveryFailures(env, ownerId)) + 1;
    const nextLockedUntil = failureCount >= RECOVERY_LOCK_THRESHOLD
      ? isoAfterMinutes(RECOVERY_LOCK_MINUTES)
      : null;
    await recordAuthEvent(env, {
      eventType: "recovery_code_used",
      success: false,
      ip: input.clientIp,
      country: input.clientCountry,
      userAgent: input.userAgent,
      detail: {
        reason: "invalid_recovery_details",
        ownerId,
        lockedUntil: nextLockedUntil,
      },
    });
    if (nextLockedUntil) {
      await recordAuthEvent(env, {
        eventType: "recovery_code_locked",
        success: false,
        ip: input.clientIp,
        country: input.clientCountry,
        userAgent: input.userAgent,
        detail: { ownerId, lockedUntil: nextLockedUntil },
      });
    }
    throw new Error("Recovery details are invalid");
  }

  const updatedAt = nowIso();
  const passwordHash = await hashPassword(input.newPassword);
  const nextVersion = owner.sessionVersion + 1;
  await env.DB.batch([
    env.DB.prepare(
      `update recovery_codes
       set used_at = ?
       where id = ?`,
    ).bind(updatedAt, codeRow.id),
    env.DB.prepare(
      `update owner_account
       set password_hash = ?,
           password_algo = ?,
           password_updated_at = ?,
           failed_login_count = 0,
           locked_until = null,
           session_version = ?,
           updated_at = ?
       where id = ?`,
    ).bind(passwordHash, "pbkdf2_sha256", updatedAt, nextVersion, updatedAt, owner.id),
  ]);

  await recordAuthEvent(env, {
    eventType: "recovery_code_used",
    success: true,
    ip: input.clientIp,
    country: input.clientCountry,
    userAgent: input.userAgent,
    detail: { ownerId: owner.id },
  });

  return sanitizeOwner(await getOwnerAccount(env));
}

export async function signOutAllDevices(env, ownerId, context = {}) {
  const owner = await getOwnerAccount(env);
  if (!owner || owner.id !== ownerId) {
    throw new Error("Owner account was not found");
  }

  const updatedAt = nowIso();
  await env.DB.prepare(
    `update owner_account
     set session_version = ?,
         updated_at = ?
     where id = ?`,
  ).bind(owner.sessionVersion + 1, updatedAt, owner.id).run();

  await recordAuthEvent(env, {
    eventType: "sign_out_all_devices",
    success: true,
    ...context,
    detail: { ownerId: owner.id },
  });

  return sanitizeOwner(await getOwnerAccount(env));
}

export async function isValidOwnerSession(env, session) {
  if (!session || session.mode !== "active" || !session.sub) {
    return null;
  }

  const owner = await getOwnerAccount(env);
  if (!owner || owner.id !== session.sub) {
    return null;
  }

  if (Number(session.sessionVersion || 0) !== owner.sessionVersion) {
    return null;
  }

  return sanitizeOwner(owner);
}

function mapOwnerRow(row) {
  return {
    id: row.id,
    email: row.email,
    recoveryEmail: row.recovery_email || "",
    passwordHash: row.password_hash,
    passwordAlgo: row.password_algo,
    passwordUpdatedAt: row.password_updated_at,
    workspaceClaimedAt: row.workspace_claimed_at,
    emailOtpEnabled: Boolean(row.email_otp_enabled),
    lastLoginAt: row.last_login_at || "",
    lastLoginIp: row.last_login_ip || "",
    failedLoginCount: Number(row.failed_login_count || 0),
    lockedUntil: row.locked_until || null,
    sessionVersion: Number(row.session_version || 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createOwnerAccount(env, input) {
  const timestamp = nowIso();
  const passwordHash = await hashPassword(input.password);
  const recoveryCodes = createRecoveryCodes();
  const codeInserts = await Promise.all(
    recoveryCodes.map(async (code) => env.DB.prepare(
      `insert into recovery_codes (id, owner_id, code_hash, used_at, created_at)
       values (?, ?, ?, null, ?)`,
    ).bind(
      crypto.randomUUID(),
      OWNER_ID,
      await sha256Text(code),
      timestamp,
    )),
  );

  await env.DB.batch([
    env.DB.prepare(
      `insert into owner_account (
         id,
         email,
         recovery_email,
         password_hash,
         password_algo,
         password_updated_at,
         workspace_claimed_at,
         email_otp_enabled,
         last_login_at,
         last_login_ip,
         failed_login_count,
         locked_until,
         session_version,
         created_at,
         updated_at
       ) values (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, null, 1, ?, ?)`,
    ).bind(
      OWNER_ID,
      normalizeEmail(input.email),
      input.recoveryEmail ? normalizeEmail(input.recoveryEmail) : null,
      passwordHash,
      "pbkdf2_sha256",
      timestamp,
      timestamp,
      timestamp,
      input.clientIp || null,
      timestamp,
      timestamp,
    ),
    ...codeInserts,
    ...(input.claimTokenId
      ? [
          env.DB.prepare(
            `update claim_tokens
             set used_at = ?
             where id = ?`,
          ).bind(timestamp, input.claimTokenId),
        ]
      : []),
  ]);

  await recordAuthEvent(env, {
    eventType: input.eventType,
    success: true,
    ip: input.clientIp,
    detail: { ownerId: OWNER_ID, email: normalizeEmail(input.email) },
  });

  return {
    owner: sanitizeOwner(await getOwnerAccount(env)),
    recoveryCodes,
  };
}

async function replaceRecoveryCodes(env, ownerId) {
  const codes = createRecoveryCodes();
  const timestamp = nowIso();
  const inserts = await Promise.all(
    codes.map(async (code) => {
      const id = crypto.randomUUID();
      return {
        id,
        statement: env.DB.prepare(
      `insert into recovery_codes (id, owner_id, code_hash, used_at, created_at)
       values (?, ?, ?, null, ?)`,
        ).bind(
          id,
          ownerId,
          await sha256Text(code),
          timestamp,
        ),
      };
    }),
  );

  const newIds = inserts.map((item) => item.id);
  const placeholders = newIds.map(() => "?").join(", ");
  await env.DB.batch([
    ...inserts.map((item) => item.statement),
    env.DB.prepare(
      `delete from recovery_codes
       where owner_id = ?
         and id not in (${placeholders})`,
    ).bind(ownerId, ...newIds),
  ]);
  return codes;
}

async function verifyClaimCode(env, claimCode, context = {}) {
  const clientIp = context.clientIp || null;
  const claimLockUntil = await getClaimLockUntil(env, clientIp);
  if (claimLockUntil) {
    throw new Error("Claim path temporarily locked");
  }

  const code = String(claimCode || "").trim();
  if (!code) {
    const nextLockUntil = await registerClaimFailure(env, clientIp);
    if (nextLockUntil) {
      throw new Error("Claim path temporarily locked");
    }
    return { ok: false };
  }

  const manual = String(env.CLAIM_KEY || "");
  const tokenHash = await sha256Text(code);
  if (manual && timingSafeEqual(code, manual)) {
    const existing = await env.DB.prepare(
      `select id
       from claim_tokens
       where token_hash = ?
         and used_at is null
         and expires_at > ?
       limit 1`,
    ).bind(tokenHash, nowIso()).first();

    if (existing?.id) {
      return { ok: true, source: "env", claimTokenId: existing.id };
    }

    const createdAt = nowIso();
    const expiresAt = isoAfterHours(CLAIM_TTL_HOURS);
    const claimTokenId = crypto.randomUUID();
    await env.DB.prepare(
      `insert into claim_tokens (id, token_hash, source, expires_at, used_at, created_at)
       values (?, ?, ?, ?, null, ?)`,
    ).bind(
      claimTokenId,
      tokenHash,
      "env",
      expiresAt,
      createdAt,
    ).run();

    return { ok: true, source: "env", claimTokenId };
  }

  const row = await env.DB.prepare(
    `select id
     from claim_tokens
     where token_hash = ?
       and used_at is null
       and expires_at > ?
     limit 1`,
  ).bind(tokenHash, nowIso()).first();

  if (row) {
    return { ok: true, source: "generated", claimTokenId: row.id };
  }

  const nextLockUntil = await registerClaimFailure(env, clientIp);
  if (nextLockUntil) {
    throw new Error("Claim path temporarily locked");
  }
  return { ok: false };
}

function createRecoveryCodes() {
  const codes = [];
  for (let index = 0; index < RECOVERY_CODE_COUNT; index += 1) {
    codes.push(`burn-${randomToken(4).toUpperCase()}-${randomToken(4).toUpperCase()}`);
  }
  return codes;
}

function randomToken(bytes) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, (value) => value.toString(16).padStart(2, "0")).join("");
}

function nowIso() {
  return new Date().toISOString();
}

function isoAfterHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function isoAfterMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function assertValidEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("A valid email address is required");
  }
}

function assertValidPassword(password) {
  const value = String(password || "");
  if (value.length < PASSWORD_MIN_LENGTH) {
    throw new Error("Password must be at least 8 characters");
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    throw new Error("Password must be at most 1024 characters");
  }
}

async function hashPassword(password) {
  const salt = randomToken(16);
  const hash = await derivePasswordHash(password, salt, PASSWORD_HASH_ITERATIONS);
  return `pbkdf2_sha256$${PASSWORD_HASH_ITERATIONS}$${salt}$${hash}`;
}

async function verifyPassword(password, storedHash) {
  const [algo, iterationsRaw, salt, expected] = String(storedHash || "").split("$");
  if (algo !== "pbkdf2_sha256" || !iterationsRaw || !salt || !expected) {
    return false;
  }

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < PASSWORD_HASH_ITERATIONS_MIN || iterations > PASSWORD_HASH_ITERATIONS_MAX) {
    return false;
  }

  const derived = await derivePasswordHash(password, salt, iterations);
  return timingSafeEqual(derived, expected);
}

async function derivePasswordHash(password, salt, iterations) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(password || "")),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    256,
  );

  return encodeBase64Url(new Uint8Array(bits));
}

async function sha256Text(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(value || "")),
  );
  return encodeBase64Url(new Uint8Array(digest));
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function recordAuthEvent(env, input) {
  if (!env.DB) {
    return;
  }

  try {
    await env.DB.prepare(
      `insert into auth_events (id, event_type, success, ip, country, user_agent, detail_json, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      input.eventType,
      input.success ? 1 : 0,
      input.ip || null,
      input.country || null,
      input.userAgent || null,
      input.detail ? JSON.stringify(input.detail) : null,
      nowIso(),
    ).run();
  } catch (error) {
    console.error("auth_event_write_failed", error);
  }
}

function sanitizeOwner(owner) {
  if (!owner) {
    return null;
  }

  const {
    passwordHash: _passwordHash,
    passwordAlgo: _passwordAlgo,
    ...safeOwner
  } = owner;
  return safeOwner;
}

async function getRecentLegacyLoginFailureCount(env, clientIp) {
  if (!env.DB) {
    return 0;
  }

  const row = clientIp
    ? await env.DB.prepare(
      `select count(*) as count
       from auth_events
       where event_type = 'legacy_login_failed'
         and success = 0
         and ip = ?
         and created_at > ?`,
    ).bind(clientIp, isoBeforeMinutes(LEGACY_LOGIN_WINDOW_MINUTES)).first()
    : await env.DB.prepare(
      `select count(*) as count
       from auth_events
       where event_type = 'legacy_login_failed'
         and success = 0
         and ip is null
         and created_at > ?`,
    ).bind(isoBeforeMinutes(LEGACY_LOGIN_WINDOW_MINUTES)).first();
  return Number(row?.count || 0);
}

async function getClaimLockUntil(env, clientIp) {
  if (!env.DB || !clientIp) {
    return null;
  }

  const row = await env.DB.prepare(
    `select json_extract(detail_json, '$.lockedUntil') as locked_until
     from auth_events
     where event_type = 'claim_code_locked'
       and ip = ?
     order by created_at desc
     limit 1`,
  ).bind(clientIp).first();

  const lockUntil = row?.locked_until || null;
  if (!lockUntil) {
    return null;
  }
  return Date.parse(lockUntil) > Date.now() ? lockUntil : null;
}

async function countRecentClaimFailures(env, clientIp) {
  if (!env.DB || !clientIp) {
    return 0;
  }

  const row = await env.DB.prepare(
    `select count(*) as count
     from auth_events
     where event_type = 'claim_code_failed'
       and success = 0
       and ip = ?
       and created_at > ?`,
  ).bind(clientIp, isoBeforeMinutes(CLAIM_FAILURE_WINDOW_MINUTES)).first();
  return Number(row?.count || 0);
}

async function registerClaimFailure(env, clientIp) {
  if (!clientIp) {
    await recordAuthEvent(env, {
      eventType: "claim_code_failed",
      success: false,
      ip: null,
      detail: { reason: "invalid_claim_code", lockedUntil: null },
    });
    return null;
  }

  const nextFailureCount = (await countRecentClaimFailures(env, clientIp)) + 1;
  const lockedUntil = nextFailureCount >= CLAIM_LOCK_THRESHOLD
    ? isoAfterMinutes(CLAIM_LOCK_MINUTES)
    : null;

  await recordAuthEvent(env, {
    eventType: "claim_code_failed",
    success: false,
    ip: clientIp,
    detail: { reason: "invalid_claim_code", lockedUntil },
  });

  if (lockedUntil) {
    await recordAuthEvent(env, {
      eventType: "claim_code_locked",
      success: false,
      ip: clientIp,
      detail: { lockedUntil },
    });
  }

  return lockedUntil;
}

async function getRecoveryLockUntil(env, ownerId) {
  if (!env.DB || !ownerId) {
    return null;
  }

  const row = await env.DB.prepare(
    `select json_extract(detail_json, '$.lockedUntil') as locked_until
     from auth_events
     where event_type = 'recovery_code_locked'
       and json_extract(detail_json, '$.ownerId') = ?
     order by created_at desc
     limit 1`,
  ).bind(ownerId).first();

  const lockUntil = row?.locked_until || null;
  if (!lockUntil) {
    return null;
  }
  return Date.parse(lockUntil) > Date.now() ? lockUntil : null;
}

async function countRecentRecoveryFailures(env, ownerId) {
  if (!env.DB || !ownerId) {
    return 0;
  }

  const row = await env.DB.prepare(
    `select count(*) as count
     from auth_events
     where event_type = 'recovery_code_used'
       and success = 0
       and json_extract(detail_json, '$.ownerId') = ?
       and created_at > ?`,
  ).bind(ownerId, isoBeforeMinutes(RECOVERY_FAILURE_WINDOW_MINUTES)).first();
  return Number(row?.count || 0);
}

function throwAuthMigrationError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("no such table") && (
    message.includes("owner_account")
    || message.includes("claim_tokens")
    || message.includes("recovery_codes")
    || message.includes("auth_events")
  )) {
    throw new Error("owner auth migration is required");
  }
  throw error;
}

function isoBeforeMinutes(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}
