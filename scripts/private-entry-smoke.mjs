import assert from "node:assert/strict";
import fs from "node:fs";

import { renderAuthPage } from "../src/lib/auth-layout.js";
import { renderAppPage } from "../src/lib/layout.js";

const APP_ENTRY_PATH = "/your-private-entry";
const API_BASE = `${APP_ENTRY_PATH}/api`;

function assertIncludes(haystack, needle, label) {
  assert.ok(haystack.includes(needle), `${label}: expected to include ${needle}`);
}

function assertNotIncludes(haystack, needle, label) {
  assert.ok(!haystack.includes(needle), `${label}: expected not to include ${needle}`);
}

function run() {
  const appHtml = renderAppPage({
    files: [
      {
        id: "file_1",
        filename: "demo.txt",
        size: 128,
        tags: ["demo"],
        note: "",
        createdAt: "2026-04-13T00:00:00.000Z",
        activeShare: null,
      },
    ],
    owner: {
      email: "owner@example.com",
      recoveryEmail: "owner@example.com",
      lastLoginAt: "2026-04-13T00:00:00.000Z",
      lastLoginIp: "127.0.0.1",
    },
    apiBase: API_BASE,
    appEntryPath: APP_ENTRY_PATH,
    deployment: {
      workspaceHost: "workspace.example.com",
      shareHost: "share.example.net",
      shareLinkSecretConfigured: true,
      hostnameSharing: true,
    },
  });

  assertIncludes(appHtml, `apiBase: "${API_BASE}"`, "app boot apiBase");
  assertIncludes(appHtml, `appEntryPath: "${APP_ENTRY_PATH}"`, "app boot entry path");
  assertIncludes(appHtml, "⚙️ Deployment", "deployment card renders");
  assertIncludes(appHtml, "<span>Version</span><strong>2.3.1</strong>", "deployment card shows current version");
  assertIncludes(appHtml, "<span>Private entry</span><strong>/your-private-entry</strong>", "deployment card shows private entry");
  assertIncludes(appHtml, "<span>Workspace host</span><strong>workspace.example.com</strong>", "deployment card shows workspace host");
  assertIncludes(appHtml, "<span>Share host</span><strong>share.example.net</strong>", "deployment card shows share host");
  assertIncludes(appHtml, "<span>Share link secret</span><strong>Configured</strong>", "deployment card shows share secret status");
  assertIncludes(appHtml, "<span>Hostname-style sharing</span><strong>Enabled</strong>", "deployment card shows hostname sharing status");
  assertIncludes(appHtml, "fetch(apiUrl(\"/files\"))", "refresh uses derived apiBase");
  assertIncludes(appHtml, "fetch(apiUrl(\"/auth/logout\"), { method: \"POST\" })", "logout uses derived apiBase");
  assertIncludes(appHtml, "fetch(apiUrl(\"/files/init-upload\")", "init-upload uses derived apiBase");
  assertIncludes(appHtml, "fetch(apiUrl(`/files/${input.fileId}/upload-part?partNumber=${input.partNumber}`)", "upload-part uses derived apiBase");
  assertIncludes(appHtml, "fetch(apiUrl(\"/files/complete-upload\")", "complete-upload uses derived apiBase");
  assertIncludes(appHtml, "fetch(apiUrl(`/files/${fileId}/shares`)", "share create uses derived apiBase");
  assertIncludes(appHtml, "fetch(apiUrl(`/shares/${shareId}/revoke`)", "share revoke uses derived apiBase");

  const authHtml = renderAuthPage({
    view: "login",
    ownerEmail: "owner@example.com",
    apiBase: API_BASE,
    appEntryPath: APP_ENTRY_PATH,
    recoverPath: `${APP_ENTRY_PATH}/recover`,
  });

  assertIncludes(authHtml, `"apiBase":"${API_BASE}"`, "auth boot apiBase");
  assertIncludes(authHtml, `"appEntryPath":"${APP_ENTRY_PATH}"`, "auth boot entry path");
  assertIncludes(authHtml, `"recoverPath":"${APP_ENTRY_PATH}/recover"`, "auth boot recover path");
  assertIncludes(authHtml, "await postJson(apiUrl(\"/auth/login\")", "auth login uses derived apiBase");

  const layoutSource = fs.readFileSync(new URL("../src/lib/layout.js", import.meta.url), "utf8");
  const authLayoutSource = fs.readFileSync(new URL("../src/lib/auth-layout.js", import.meta.url), "utf8");
  const workerSource = fs.readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");

  assertNotIncludes(layoutSource, "fetch(\"/api/files\")", "app page should not fetch bare /api/files");
  assertNotIncludes(layoutSource, "fetch(\"/api/auth/logout\")", "app page should not fetch bare /api/auth/logout");
  assertNotIncludes(layoutSource, "fetch(\"/api/files/init-upload\")", "app page should not fetch bare /api/files/init-upload");
  assertNotIncludes(authLayoutSource, "postJson(\"/api/auth/login\"", "auth page should not post to bare /api/auth/login");

  assertIncludes(workerSource, "const privateEntryPath = getAppEntryPath(env);", "worker reads APP_ENTRY_PATH");
  assertIncludes(workerSource, "const uploadPartMatch = privateRoutePath?.match(/^\\/api\\/files\\/([^/]+)\\/upload-part\\/?$/);", "worker upload-part route is prefixed");
  assertIncludes(workerSource, "const abortUploadMatch = privateRoutePath?.match(/^\\/api\\/files\\/([^/]+)\\/abort-upload\\/?$/);", "worker abort-upload route is prefixed");
  assertIncludes(workerSource, "throw new Error(\"APP_ENTRY_PATH cannot end with '/'\")", "worker validates APP_ENTRY_PATH");

  console.log("private-entry smoke passed");
}

run();
