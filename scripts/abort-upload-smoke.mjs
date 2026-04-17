import assert from "node:assert/strict";
import vm from "node:vm";

import { script as uploadScript } from "../src/lib/client/upload.js";

// Extract just the abortUpload function from the client script string and
// evaluate it in a sandboxed context with a controllable fetch mock.

function makeContext(fetchImpl) {
  return vm.createContext({
    fetch: fetchImpl,
    apiUrl: (path) => `https://example.com${path}`,
  });
}

function extractAbortUpload(ctx) {
  // Evaluate the full upload script, then return the abortUpload function.
  const src = uploadScript();
  vm.runInContext(src, ctx);
  return vm.runInContext("abortUpload", ctx);
}

async function run() {
  // --- abortUpload: 200 OK resolves without throwing ---
  {
    const ctx = makeContext(async () => ({ ok: true, status: 200 }));
    const abortUpload = extractAbortUpload(ctx);
    await abortUpload("file_ok");
  }

  // --- abortUpload: 404 (plan already gone) resolves without throwing ---
  {
    const ctx = makeContext(async () => ({ ok: false, status: 404 }));
    const abortUpload = extractAbortUpload(ctx);
    await abortUpload("file_404");
  }

  // --- abortUpload: 409 (already completed) resolves without throwing ---
  {
    const ctx = makeContext(async () => ({ ok: false, status: 409 }));
    const abortUpload = extractAbortUpload(ctx);
    await abortUpload("file_409");
  }

  // --- abortUpload: 500 throws ---
  {
    const ctx = makeContext(async () => ({ ok: false, status: 500 }));
    const abortUpload = extractAbortUpload(ctx);
    await assert.rejects(
      () => abortUpload("file_500"),
      /Server returned 500/,
    );
  }

  // --- abortUpload: network error throws ---
  {
    const ctx = makeContext(async () => { throw new Error("network down"); });
    const abortUpload = extractAbortUpload(ctx);
    await assert.rejects(
      () => abortUpload("file_net"),
      /Abort request failed/,
    );
  }

  // --- best-effort pattern: abort throws but caller surfaces original error ---
  {
    const ctx = makeContext(async () => ({ ok: false, status: 500 }));
    const abortUpload = extractAbortUpload(ctx);
    const originalError = new Error("Part 3 failed after 4 attempts");
    let surfaced;
    try {
      try { await abortUpload("file_x"); } catch { /* best-effort */ }
      throw originalError;
    } catch (err) {
      surfaced = err;
    }
    assert.strictEqual(surfaced, originalError, "best-effort cleanup must not swallow original error");
  }

  // --- no-op when fileId is falsy ---
  {
    const ctx = makeContext(async () => { throw new Error("should not be called"); });
    const abortUpload = extractAbortUpload(ctx);
    await abortUpload(null);
    await abortUpload("");
  }

  console.log("abort-upload smoke passed");
}

run();
