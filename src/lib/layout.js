import { script as clientHelpersScript } from "./client/helpers.js";
import { script as clientShareScript } from "./client/share.js";
import { script as clientFilesScript } from "./client/files.js";
import { script as clientUploadScript } from "./client/upload.js";
import { script as clientBootWiringScript } from "./client/boot-wiring.js";

const BURNBOX_VERSION = "2.3.0";

function renderDeploymentCard(dep, appEntryPath) {
  const row = (label, value, warn = false) =>
    `<div class="stats-row${warn ? " stats-row--warn" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;

  const shareLinkRow = dep.shareLinkSecretConfigured
    ? row("Share link secret", "Configured")
    : row("Share link secret", "Not configured — public share downloads will fail (503)", true);

  return `
    <section class="layout app" style="margin-bottom:0;">
      <section class="panel" style="padding:0;background:rgba(20,50,82,0.06);box-shadow:none;">
        <details>
          <summary style="padding:1rem 1.5rem;font-size:1rem;font-weight:600;letter-spacing:0.02em;cursor:pointer;list-style:none;display:flex;align-items:center;gap:0.5rem;">
            <span style="opacity:0.45;font-size:0.75rem;" class="deploy-chevron">▶</span> ⚙️ Deployment <span class="deploy-hint" style="font-size:0.75rem;font-weight:400;opacity:0.4;margin-left:0.25rem;">— click to expand</span>
          </summary>
          <div class="stats" style="gap:0.35rem;padding:0 1.5rem 1.25rem;">
            ${row("Version", BURNBOX_VERSION)}
            ${row("Private entry", appEntryPath || "/")}
            ${dep.workspaceHost ? row("Workspace host", dep.workspaceHost) : ""}
            ${dep.shareHost ? row("Share host", dep.shareHost) : ""}
            ${shareLinkRow}
            ${row("Hostname-style sharing", dep.hostnameSharing ? "Enabled" : "Disabled")}
          </div>
        </details>
      </section>
    </section>
    <script>
      (function() {
        var det = document.currentScript.previousElementSibling.querySelector("details");
        var chev = det.querySelector(".deploy-chevron");
        var hint = det.querySelector(".deploy-hint");
        det.addEventListener("toggle", function() {
          chev.textContent = det.open ? "▼" : "▶";
          if (hint) hint.style.display = det.open ? "none" : "";
        });
      })();
    </script>`;
}

function renderFirstDeployBanner(dep, appEntryPath) {
  // Show a one-time informational banner only when APP_ENTRY_PATH was not configured (entry is "/").
  if (!dep || (appEntryPath && appEntryPath !== "/")) {
    return "";
  }
  // The banner is dismissed client-side via localStorage; render a hidden element, JS shows it.
  return `<div id="firstDeployBanner" class="notification is-info is-light" style="display:none;margin:1rem 1.5rem 0;">
    <strong>Private entry:</strong> / (default).
    To serve the workspace under a custom prefix, set <code>APP_ENTRY_PATH</code> in <code>wrangler.toml</code> and redeploy.
    <button style="float:right;background:none;border:none;cursor:pointer;font-size:1.1rem;" id="dismissFirstDeployBanner" aria-label="Dismiss">&times;</button>
  </div>
  <script>
    (function() {
      if (!localStorage.getItem("burnbox_first_deploy_banner_dismissed")) {
        var el = document.getElementById("firstDeployBanner");
        if (el) el.style.display = "";
      }
      document.getElementById("dismissFirstDeployBanner")?.addEventListener("click", function() {
        localStorage.setItem("burnbox_first_deploy_banner_dismissed", "1");
        document.getElementById("firstDeployBanner").style.display = "none";
      });
    })();
  </script>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderAppPage({ files, owner = null, apiBase = "/api", appEntryPath = "/", deployment = null }) {
  const filesJson = JSON.stringify(files).replaceAll("<", "\\u003c");
  const safeOwner = owner
    ? {
        email: owner.email || "",
        recoveryEmail: owner.recoveryEmail || "",
        lastLoginAt: owner.lastLoginAt || "",
        lastLoginIp: owner.lastLoginIp || "",
      }
    : null;
  const ownerJson = JSON.stringify(safeOwner).replaceAll("<", "\\u003c");
  const faviconHref = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath fill='%23143252' d='M34 4c2 7 7 12 12 17 6 6 9 13 9 20 0 13-9 23-23 23S9 54 9 41c0-9 5-16 11-22 5-5 10-9 12-17 0-2 1-2 2 0z'/%3E%3Cpath fill='%23ffffff' d='M35 14c1 5 5 8 8 11 4 4 6 8 6 13 0 8-6 14-14 14s-14-6-14-14c0-5 2-9 6-13 3-3 6-6 8-11z'/%3E%3Cpath fill='%23c23a2b' d='M35 27c1 3 3 5 5 7 2 2 3 4 3 7 0 5-4 9-9 9s-9-4-9-9c0-4 2-6 4-8 3-2 5-4 6-6z'/%3E%3C/svg%3E";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BurnBox</title>
    <link rel="icon" href="${faviconHref}" type="image/svg+xml" />
    <style>
      :root {
        --navy: #143252;
        --navy-soft: #1d436b;
        --sky: #dff0f7;
        --sky-deep: #cfe5ee;
        --sand: #e6c27f;
        --sand-deep: #dbb369;
        --sand-panel: rgba(230, 194, 127, 0.94);
        --cream: #fbfaf6;
        --ink: #273547;
        --muted: #4f6274;
        --line: rgba(20, 50, 82, 0.14);
        --danger: #9f1713;
        --danger-deep: #7c120f;
        --success: #214e3c;
        --shadow: 0 24px 60px rgba(20, 50, 82, 0.16);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(255, 255, 255, 0.55), transparent 24%),
          linear-gradient(180deg, var(--sky) 0%, #e7f5fb 100%);
      }

      button, input, select {
        font: inherit;
      }

      .topbar {
        background: linear-gradient(180deg, var(--navy) 0%, #173a5f 100%);
        color: white;
        padding: 22px 20px 26px;
        box-shadow: 0 6px 24px rgba(20, 50, 82, 0.18);
      }

      .topbar-inner {
        width: min(1280px, calc(100% - 24px));
        margin: 0 auto;
        display: grid;
        gap: 8px;
        justify-items: center;
        text-align: center;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        font-size: clamp(2rem, 5vw, 3rem);
        line-height: 1;
        font-weight: 700;
        letter-spacing: -0.04em;
      }

      .brand-mark {
        width: clamp(34px, 5vw, 48px);
        height: clamp(34px, 5vw, 48px);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .brand-mark svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .brand-word {
        display: inline-block;
        text-shadow: 0 10px 28px rgba(8, 20, 36, 0.18);
      }

      .brand-word .brand-target {
        display: inline-block;
        width: 0.78em;
        height: 0.78em;
        margin: 0 0.03em 0 0.01em;
        border-radius: 999px;
        vertical-align: -0.06em;
        background:
          radial-gradient(circle,
            #be3127 0 16%,
            #fff7f2 16% 31%,
            #be3127 31% 48%,
            #fff7f2 48% 66%,
            #be3127 66% 100%);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.14),
          0 8px 18px rgba(159, 23, 19, 0.16);
      }

      .tagline {
        color: rgba(222, 235, 248, 0.86);
        font-size: 0.98rem;
      }

      .shell {
        width: min(1280px, calc(100% - 24px));
        margin: 24px auto 40px;
      }

      .hero {
        display: grid;
        gap: 10px;
        padding: 22px 24px;
        border-radius: 28px;
        background: rgba(248, 253, 255, 0.72);
        border: 1px solid rgba(20, 50, 82, 0.1);
        box-shadow: var(--shadow);
        position: relative;
      }

      .hero::after {
        content: "";
        position: absolute;
        left: 24px;
        right: 24px;
        bottom: 0;
        height: 1px;
        background: linear-gradient(90deg, rgba(20, 50, 82, 0.18), rgba(20, 50, 82, 0.06));
      }

      .hero-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.72fr);
        gap: 28px;
        align-items: center;
      }

      .hero-copy {
        display: grid;
        gap: 16px;
      }

      .eyebrow {
        display: inline-flex;
        width: fit-content;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(20, 50, 82, 0.08);
        color: var(--navy-soft);
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 0.75rem;
      }

      .hero h1 {
        margin: 0;
        max-width: 11ch;
        font-size: clamp(3rem, 7vw, 5.8rem);
        line-height: 0.88;
        letter-spacing: -0.07em;
        color: #1f2d3d;
      }

      .hero p {
        margin: 0;
        max-width: 700px;
        color: var(--muted);
        font-size: 1.05rem;
        line-height: 1.45;
      }

      .hero-side {
        display: grid;
        gap: 14px;
        width: min(100%, 520px);
        justify-self: end;
        align-self: start;
      }

      .hero-note {
        width: 100%;
        min-width: 0;
        padding: 18px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(20, 50, 82, 0.08);
      }

      .hero-note.dark {
        background: linear-gradient(180deg, rgba(20, 50, 82, 0.96), rgba(29, 67, 107, 0.94));
        border-color: rgba(255, 255, 255, 0.08);
        box-shadow: 0 16px 32px rgba(20, 50, 82, 0.18);
      }

      .hero-note.dark .hero-note-label {
        color: rgba(222, 235, 248, 0.78);
      }

      .hero-note.dark .account-meta-row span {
        color: rgba(222, 235, 248, 0.78);
        opacity: 1;
      }

      .hero-note.dark strong,
      .hero-note.dark p {
        color: rgba(255, 255, 255, 0.94);
      }

      .hero-note.light {
        background: rgba(255, 255, 255, 0.7);
      }

      .hero-note-label {
        display: block;
        margin-bottom: 8px;
        color: var(--navy-soft);
        font-size: 0.76rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .hero-note strong {
        display: block;
        font-size: 1.1rem;
        line-height: 1.25;
      }

      .hero-note p {
        margin-top: 10px;
        font-size: 0.95rem;
      }

      .account-note {
        display: grid;
        gap: 10px;
        position: relative;
        min-height: 304px;
        overflow: hidden;
      }

      .account-meta {
        display: grid;
        gap: 10px;
      }

      .account-meta-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: baseline;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 0.92rem;
        min-width: 0;
      }

      .hero-note.light .account-meta-row {
        border-top-color: rgba(20, 50, 82, 0.1);
      }

      .account-meta-row span {
        color: inherit;
        opacity: 0.78;
      }

      .account-meta-row strong {
        margin: 0;
        font-size: 0.92rem;
        text-align: right;
        min-width: 0;
        max-width: 58%;
        word-break: break-word;
        overflow-wrap: anywhere;
      }

      .account-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .account-actions button {
        flex: 0 0 auto;
        min-width: 0;
        padding: 9px 13px;
        border-radius: 14px;
        font-size: 0.92rem;
      }

      .meta-value {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }

      .account-actions button.is-success {
        background: rgba(255, 255, 255, 0.18);
        color: white;
        border-color: rgba(255, 255, 255, 0.2);
      }

      .inline-note {
        margin: 0;
        font-size: 0.82rem;
        color: var(--muted);
      }

      .hero-note.dark .inline-note {
        color: rgba(222, 235, 248, 0.74);
      }

      .codes-inline {
        display: none;
        min-height: 112px;
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px dashed rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.08);
        color: white;
        white-space: pre-wrap;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.84rem;
      }

      .codes-inline.active {
        display: block;
      }

      .card-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }

      .card-head > div {
        min-width: 0;
      }

      .account-email-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .account-email-row strong {
        margin: 0;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .small-ghost {
        color: white;
        background: rgba(255, 255, 255, 0.14);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 0.84rem;
      }

      .small-ghost.light {
        color: var(--navy);
        background: rgba(255, 255, 255, 0.88);
        border-color: rgba(20, 50, 82, 0.12);
      }

      .account-panel {
        position: absolute;
        inset: 0;
        display: none;
        gap: 10px;
        align-content: start;
        padding: 14px 16px;
        border-radius: inherit;
        background: linear-gradient(180deg, rgba(20, 50, 82, 0.98), rgba(29, 67, 107, 0.96));
        z-index: 2;
        overflow: hidden;
      }

      .account-panel.active {
        display: grid;
      }

      .account-panel .field {
        gap: 4px;
        max-width: 100%;
      }

      .account-panel .field label {
        color: rgba(222, 235, 248, 0.86);
        font-size: 0.74rem;
      }

      .account-panel input {
        background: rgba(255, 255, 255, 0.94);
        padding: 9px 12px;
        border-radius: 13px;
        min-height: 38px;
        box-shadow: 0 4px 14px rgba(20, 50, 82, 0.07);
      }

      .account-panel-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }

      .account-panel-title strong {
        margin: 0;
        font-size: 0.9rem;
      }

      .account-panel .field-row {
        gap: 12px;
      }

      .account-panel .primary,
      .account-panel .secondary {
        width: fit-content;
        min-width: 0;
        padding: 9px 14px;
        border-radius: 12px;
        font-size: 0.88rem;
      }

      .panel-copy {
        margin: -2px 0 0;
        max-width: 420px;
        color: rgba(222, 235, 248, 0.78);
        font-size: 0.74rem;
        line-height: 1.35;
      }

      .account-panel.password-panel {
        gap: 8px;
      }

      .account-panel.password-panel .field {
        gap: 3px;
      }

      .account-panel.password-panel .field-row {
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .account-panel.password-panel input {
        padding: 8px 12px;
        min-height: 36px;
      }

      .account-panel.password-panel .panel-copy {
        max-width: 400px;
      }

      .layout {
        display: grid;
        gap: 24px;
        margin-top: 24px;
      }

      .layout.auth {
        grid-template-columns: 1fr 1fr;
      }

      .layout.app {
        grid-template-columns: 1fr;
      }

      .stack {
        display: grid;
        gap: 16px;
      }

      .panel {
        padding: 28px;
        border-radius: 28px;
        background: var(--sand-panel);
        border: 1px solid rgba(124, 82, 25, 0.08);
        box-shadow: 0 22px 48px rgba(101, 75, 35, 0.16);
      }

      .panel.cool {
        background: rgba(250, 252, 253, 0.76);
        border: 1px solid rgba(20, 50, 82, 0.08);
        box-shadow: var(--shadow);
      }

      .panel h2 {
        margin: 0;
        font-size: clamp(2rem, 4vw, 3.2rem);
        line-height: 0.95;
        letter-spacing: -0.05em;
      }

      .panel p {
        margin: 12px 0 0;
        color: rgba(39, 53, 71, 0.86);
        line-height: 1.46;
      }

      .field {
        display: grid;
        gap: 8px;
      }

      .field-row {
        display: grid;
        gap: 14px;
        grid-template-columns: 1fr 1fr;
      }

      label {
        color: rgba(39, 53, 71, 0.82);
        font-size: 0.92rem;
      }

      input[type="password"],
      input[type="email"],
      input[type="text"],
      input[type="number"],
      input[type="file"],
      select {
        width: 100%;
        min-width: 0;
        padding: 16px 18px;
        border-radius: 16px;
        border: 1px solid rgba(20, 50, 82, 0.08);
        background: rgba(255, 255, 255, 0.92);
        color: var(--ink);
        box-shadow: 0 8px 22px rgba(20, 50, 82, 0.05);
      }

      input:focus,
      select:focus {
        outline: 2px solid rgba(20, 50, 82, 0.16);
        outline-offset: 2px;
      }

      button {
        border: 0;
        border-radius: 16px;
        padding: 14px 18px;
        cursor: pointer;
        transition: transform 120ms ease, filter 120ms ease, opacity 120ms ease;
      }

      button:hover { transform: translateY(-1px); }
      button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

      .primary {
        color: white;
        background: linear-gradient(180deg, var(--danger) 0%, var(--danger-deep) 100%);
      }

      .secondary {
        color: white;
        background: linear-gradient(180deg, var(--navy-soft) 0%, var(--navy) 100%);
      }

      .ghost {
        color: var(--navy);
        background: rgba(255, 255, 255, 0.75);
        border: 1px solid rgba(20, 50, 82, 0.12);
      }

      .danger {
        color: white;
        background: linear-gradient(180deg, #b0322f 0%, #8d2320 100%);
      }

      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
        margin-bottom: 18px;
      }

      .toolbar-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .status {
        margin-bottom: 18px;
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.68);
        border: 1px solid rgba(20, 50, 82, 0.1);
      }

      .status.error {
        background: rgba(255, 241, 241, 0.84);
        border-color: rgba(159, 23, 19, 0.18);
      }

      .status-main {
        font-weight: 600;
      }

      .status-sub {
        margin-top: 4px;
        color: var(--muted);
        font-size: 0.9rem;
      }

      .stats {
        display: grid;
        gap: 12px;
        margin-top: 22px;
      }

      .stats div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding-top: 10px;
        border-top: 1px solid rgba(39, 53, 71, 0.12);
      }

      .stats span {
        color: rgba(39, 53, 71, 0.7);
      }

      .stats strong {
        text-align: right;
      }

      .workspace-grid {
        display: grid;
        gap: 18px;
      }

      .upload-strip {
        display: grid;
        gap: 20px;
      }

      .upload-strip-head {
        display: grid;
        gap: 10px;
      }

      .upload-strip-grid {
        display: grid;
        grid-template-columns: minmax(260px, 0.75fr) minmax(0, 1.25fr);
        gap: 18px 22px;
        align-items: start;
      }

      .upload-strip-form {
        display: grid;
        gap: 16px;
      }

      .upload-progress {
        display: grid;
        gap: 10px;
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(255, 250, 238, 0.62);
        border: 1px solid rgba(124, 82, 25, 0.1);
      }

      .upload-progress.hidden {
        display: none;
      }

      .upload-progress-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }

      .upload-progress-label {
        font-size: 0.92rem;
        color: rgba(39, 53, 71, 0.86);
      }

      .upload-progress-value {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--navy);
      }

      .upload-progress-track {
        position: relative;
        overflow: hidden;
        height: 12px;
        border-radius: 999px;
        background: rgba(20, 50, 82, 0.12);
      }

      .upload-progress-bar {
        width: 0%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #d7921f 0%, #e0af49 38%, #2e9b7f 100%);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
        transition: width 180ms ease;
      }

      .upload-progress.is-finalizing .upload-progress-bar {
        width: 100% !important;
        background: linear-gradient(90deg, #d7921f 0%, #e0af49 28%, #2e9b7f 58%, #d7921f 100%);
        background-size: 220% 100%;
        animation: finalizing-wave 1.15s linear infinite;
      }

      @keyframes finalizing-wave {
        0% { background-position: 200% 0; }
        100% { background-position: -20% 0; }
      }

      .upload-progress-sub {
        font-size: 0.84rem;
        color: var(--muted);
      }

      .upload-inline-fields {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(180px, 0.7fr) minmax(180px, 0.7fr) auto;
        gap: 14px;
        align-items: end;
      }

      .upload-inline-fields .field {
        min-width: 0;
      }

      .upload-inline-fields button {
        min-width: 180px;
      }

      .upload-strip-meta {
        display: grid;
        gap: 12px;
        align-self: stretch;
        padding: 18px;
        border-radius: 22px;
        background: rgba(255, 250, 238, 0.58);
        border: 1px solid rgba(124, 82, 25, 0.1);
      }

      .upload-strip-meta .stats {
        margin-top: 0;
      }

      .share-composer {
        display: none;
        padding: 22px;
        border-radius: 24px;
        background: rgba(252, 248, 239, 0.94);
        border: 1px solid rgba(20, 50, 82, 0.08);
      }

      .share-composer.active {
        display: grid;
      }

      .share-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }

      .share-head h3 {
        margin: 0;
        font-size: 2rem;
        line-height: 0.95;
      }

      .share-file {
        margin-top: 8px;
        color: var(--muted);
      }

      .checkbox-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        color: rgba(39, 53, 71, 0.9);
      }

      .checkbox-row input {
        width: 20px;
        height: 20px;
      }

      .share-result {
        display: none;
        padding: 18px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(20, 50, 82, 0.08);
      }

      .share-result.active {
        display: grid;
        gap: 12px;
      }

      .share-link {
        width: 100%;
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid rgba(20, 50, 82, 0.1);
        background: rgba(255, 255, 255, 0.95);
      }

      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .table-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: start;
        align-items: center;
      }

      .table-actions button {
        min-width: 0;
        padding: 7px 12px;
        border-radius: 12px;
        font-size: 0.84rem;
        line-height: 1;
        font-weight: 600;
        letter-spacing: 0.01em;
      }

      .table-actions .secondary,
      .table-actions .danger,
      .table-actions .ghost {
        box-shadow: none;
      }

      .table-actions .secondary {
        background: linear-gradient(180deg, #244d78 0%, #1b3f65 100%);
      }

      .table-actions .danger {
        background: linear-gradient(180deg, #bf3630 0%, #a12823 100%);
      }

      .table-actions .ghost {
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(20, 50, 82, 0.14);
      }

      .empty-state {
        padding: 28px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px dashed rgba(20, 50, 82, 0.16);
      }

      .empty-state h3 {
        margin: 0;
        font-size: 1.9rem;
      }

      .empty-state p {
        margin: 10px 0 0;
        color: var(--muted);
        max-width: 560px;
      }

      .table-wrap {
        overflow: hidden;
        border-radius: 24px;
        border: 1px solid rgba(20, 50, 82, 0.08);
        background: rgba(255, 255, 255, 0.76);
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        padding: 16px 14px;
        text-align: left;
        vertical-align: top;
        border-bottom: 1px solid rgba(20, 50, 82, 0.08);
      }

      th {
        color: rgba(20, 50, 82, 0.72);
        font-size: 0.78rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        background: rgba(20, 50, 82, 0.05);
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      .name-cell {
        font-weight: 600;
        word-break: break-word;
      }

      .subtle {
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.4;
        word-break: break-word;
      }

      .tag-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .tag {
        display: inline-flex;
        align-items: center;
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(20, 50, 82, 0.08);
        color: var(--navy);
        font-size: 0.78rem;
      }

      .share-state {
        display: grid;
        gap: 6px;
        padding: 12px;
        min-width: 170px;
        border-radius: 18px;
        background: rgba(20, 50, 82, 0.07);
      }

      .share-state-actions {
        display: flex;
        gap: 8px;
        margin-top: 4px;
        flex-wrap: wrap;
      }

      .link-mini {
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(20, 50, 82, 0.14);
        background: rgba(255, 255, 255, 0.84);
        color: var(--navy);
        font-size: 0.76rem;
        font-weight: 600;
      }

      .share-state strong {
        color: var(--navy);
      }

      .share-state.inactive {
        background: rgba(20, 50, 82, 0.04);
      }

      .share-state.inactive strong,
      .share-state.inactive span {
        color: var(--muted);
      }

      .hidden {
        display: none;
      }

      .site-footer {
        width: min(1280px, calc(100% - 24px));
        margin: 0 auto 28px;
        padding: 20px 4px 10px;
        display: flex;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
        color: var(--muted);
        font-size: 0.92rem;
      }

      .site-footer strong {
        color: var(--ink);
      }

      @media (max-width: 1080px) {
        .layout.auth,
        .layout.app,
        .field-row {
          grid-template-columns: 1fr;
        }

        .hero-grid {
          grid-template-columns: 1fr;
        }

        .hero-side {
          width: 100%;
          justify-self: stretch;
        }

        .account-meta-row {
          align-items: start;
        }

        .account-meta-row strong {
          max-width: 52%;
        }

        .upload-strip-grid,
        .upload-inline-fields {
          grid-template-columns: 1fr;
        }

        .upload-inline-fields button {
          min-width: 0;
          width: 100%;
        }

        .hero h1 {
          max-width: 10ch;
        }
      }

      @media (max-width: 720px) {
        .toolbar {
          display: grid;
          grid-template-columns: 1fr;
        }

        .toolbar-actions,
        .actions {
          width: 100%;
        }

        .toolbar-actions button,
        .actions button,
        .table-actions button {
          flex: 0 0 auto;
        }

        .table-wrap {
          overflow-x: auto;
        }

        th, td {
          min-width: 150px;
        }
      }
    </style>
  </head>
  <body>
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" role="img" focusable="false">
              <path fill="#ffffff" d="M34 4c2 7 7 12 12 17 6 6 9 13 9 20 0 13-9 23-23 23S9 54 9 41c0-9 5-16 11-22 5-5 10-9 12-17 0-2 1-2 2 0z"/>
              <path fill="#143252" d="M35 14c1 5 5 8 8 11 4 4 6 8 6 13 0 8-6 14-14 14s-14-6-14-14c0-5 2-9 6-13 3-3 6-6 8-11z"/>
              <path fill="#e6c27f" d="M35 27c1 3 3 5 5 7 2 2 3 4 3 7 0 5-4 9-9 9s-9-4-9-9c0-4 2-6 4-8 3-2 5-4 6-6z"/>
            </svg>
          </span>
          <span class="brand-word">BurnB<span class="brand-target" aria-label="o" role="img"></span>x</span>
        </div>
        <div class="tagline">Your Private R2 Drop with short-lived controlled sharing.</div>
      </div>
    </header>

    <main class="shell">
      <section class="hero">
        <div class="hero-grid">
          <div class="hero-copy">
            <div class="eyebrow">BurnBox 2.0 / Private R2 Drop</div>
            <h1>Keep the file. control the reach.</h1>
            <p>Upload into your own R2 bucket, manage the archive from a private desk, and create share windows that expire, deplete, or close on command.</p>
          </div>
          <aside class="hero-side">
            <div class="hero-note dark account-note">
              <div class="card-head">
                <div>
                  <span class="hero-note-label">Owner account</span>
                  <div class="account-email-row">
                    <strong>${escapeHtml(safeOwner?.email || "Unknown owner")}</strong>
                    <button class="small-ghost" type="button" id="logoutButton">Logout</button>
                  </div>
                  <p>Workspace identity and recovery controls stay inside BurnBox.</p>
                </div>
              </div>
              <div class="account-meta">
                <div class="account-meta-row">
                  <span>Recovery email</span>
                  <strong class="meta-value">
                    <span id="recoveryEmailDisplay">${escapeHtml(safeOwner?.recoveryEmail || "No recovery email added")}</span>
                    <button class="small-ghost light" type="button" id="toggleRecoveryEmailForm">${safeOwner?.recoveryEmail ? "Edit" : "Add"}</button>
                  </strong>
                </div>
                <div class="account-meta-row">
                  <span>Last login</span>
                  <strong id="lastLoginDisplay" data-iso="${escapeHtml(safeOwner?.lastLoginAt || "")}">${escapeHtml(safeOwner?.lastLoginAt || "Signed in during this session")}</strong>
                </div>
              </div>
              <div class="account-actions">
                <button class="ghost" type="button" id="togglePasswordForm">Change password</button>
                <button class="ghost" type="button" id="signOutAllButton">Sign Out Other Devices</button>
                <button class="ghost" type="button" id="toggleRecoveryCodes">Generate Backup Codes</button>
              </div>
              <p class="inline-note">Use backup codes only as an emergency fallback until email recovery is enabled.</p>
              <form class="account-panel password-panel" id="changePasswordPanel">
                <div class="account-panel-title">
                  <strong>Password update</strong>
                  <button class="small-ghost" type="button" id="closePasswordForm">Close</button>
                </div>
                <p class="panel-copy">Set a new password for this workspace. Other devices will be asked to sign in again after the change.</p>
                <div class="field">
                  <label for="currentPassword">Current password</label>
                  <input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required />
                </div>
                <div class="field-row">
                  <div class="field">
                    <label for="newPassword">New password</label>
                    <input id="newPassword" name="newPassword" type="password" autocomplete="new-password" required />
                  </div>
                  <div class="field">
                    <label for="confirmNewPassword">Confirm new password</label>
                    <input id="confirmNewPassword" name="confirmNewPassword" type="password" autocomplete="new-password" required />
                  </div>
                </div>
                <button class="primary" type="submit">Save new password</button>
              </form>
              <form class="account-panel" id="recoveryEmailPanel">
                <div class="account-panel-title">
                  <strong>Recovery email</strong>
                  <button class="small-ghost" type="button" id="closeRecoveryEmailForm">Close</button>
                </div>
                <p class="panel-copy">Add an email address for future account recovery. Leave it blank if you do not want to save one yet.</p>
                <div class="field">
                  <label for="recoveryEmailInput">Recovery email</label>
                  <input id="recoveryEmailInput" name="recoveryEmail" type="email" autocomplete="email" value="${escapeHtml(safeOwner?.recoveryEmail || "")}" placeholder="name@example.com" />
                </div>
                <div class="field">
                  <label for="recoveryEmailPassword">Current password</label>
                  <input id="recoveryEmailPassword" name="currentPassword" type="password" autocomplete="current-password" required />
                </div>
                <button class="secondary" type="submit">Save recovery email</button>
              </form>
              <form class="account-panel" id="recoveryCodesPanel">
                <div class="account-panel-title">
                  <strong>Generate backup codes</strong>
                  <button class="small-ghost" type="button" id="closeRecoveryCodesForm">Close</button>
                </div>
                <p class="panel-copy">Create a fresh backup-code set for emergency access. Generating a new set replaces the current one immediately.</p>
                <div class="field">
                  <label for="recoveryCodesPassword">Current password</label>
                  <input id="recoveryCodesPassword" name="currentPassword" type="password" autocomplete="current-password" required />
                </div>
                <button class="secondary" type="submit">Generate new backup codes</button>
                <textarea class="codes-inline" id="recoveryCodesOutputPanel" readonly placeholder="Fresh backup codes will appear here once generated."></textarea>
              </form>
            </div>
          </aside>
        </div>
      </section>

      ${deployment ? renderDeploymentCard(deployment, appEntryPath) : ""}

      <section class="layout app">
              <section class="panel upload-strip">
                <div class="upload-strip-grid">
                  <div class="upload-strip-head">
                    <h2>Upload Desk</h2>
                    <p>Files move through a 5 MiB multipart transfer lane. BurnBox assembles the object in R2, then writes the final registry record into D1.</p>
                  </div>
                  <div class="upload-strip-meta">
                    <div class="stats">
                      <div><span>Storage</span><strong>R2 archive</strong></div>
                      <div><span>Upload mode</span><strong>5 MiB multipart slices</strong></div>
                      <div><span>Delete mode</span><strong>Remove file and revoke shares</strong></div>
                    </div>
                  </div>
                </div>
                <form class="upload-strip-form" id="uploadForm">
                  <div class="upload-inline-fields">
                    <div class="field">
                      <label for="fileInput">File</label>
                      <input id="fileInput" name="file" type="file" required />
                    </div>
                    <div class="field">
                      <label for="tagsInput">Tags</label>
                      <input id="tagsInput" name="tags" type="text" placeholder="project, receipt" />
                    </div>
                    <div class="field">
                      <label for="noteInput">Note</label>
                      <input id="noteInput" name="note" type="text" placeholder="Optional note" />
                    </div>
                    <button class="primary" type="submit">Upload To R2</button>
                  </div>
                  <div class="upload-progress hidden" id="uploadProgress">
                    <div class="upload-progress-head">
                      <div class="upload-progress-label" id="uploadProgressLabel">Upload progress</div>
                      <div class="upload-progress-value" id="uploadProgressValue">0%</div>
                    </div>
                    <div class="upload-progress-track" aria-hidden="true">
                      <div class="upload-progress-bar" id="uploadProgressBar"></div>
                    </div>
                    <div class="upload-progress-sub" id="uploadProgressSub">Waiting for a file.</div>
                  </div>
                </form>
              </section>

              <section class="panel cool">
                <div class="toolbar">
                  <div>
                    <h2>Files</h2>
                    <p>The file list is the whole workspace. Shares are attached policies, not a separate module.</p>
                  </div>
                  <div class="toolbar-actions">
                    <button class="ghost" type="button" id="refreshButton">Refresh</button>
                  </div>
                </div>

                <div class="status" id="statusBanner">
                  <div class="status-main" id="statusText">Workspace ready.</div>
                  <div class="status-sub" id="statusSubtext">Upload, issue controlled links, revoke when needed.</div>
                </div>

                <div class="workspace-grid">
                  <section class="share-composer" id="shareComposer">
                    <div class="share-head">
                      <div>
                        <h3>Create Secure Share Link</h3>
                        <div class="share-file" id="shareTargetName">Pick a file to configure its access window.</div>
                      </div>
                      <button class="ghost" type="button" id="shareComposerClose">Close</button>
                    </div>

                    <form class="stack" id="shareForm">
                      <input type="hidden" id="shareFileId" />
                      <div class="field">
                        <label for="shareExpiry">Availability window</label>
                        <select id="shareExpiry">
                          <option value="1">1 hour</option>
                          <option value="24" selected>24 hours</option>
                          <option value="72">3 days</option>
                          <option value="168">7 days</option>
                          <option value="null">No expiration</option>
                        </select>
                      </div>
                      <div class="checkbox-row">
                        <input type="checkbox" id="limitDownloadsToggle" checked />
                        <label for="limitDownloadsToggle">Limit total downloads for this link</label>
                      </div>
                      <div class="field" id="shareDownloadsField">
                        <label for="shareDownloads">Max downloads</label>
                        <input id="shareDownloads" type="number" min="1" step="1" value="3" placeholder="Enter a download limit" />
                      </div>
                      <button class="primary" type="submit">Generate</button>
                    </form>

                    <div class="share-result" id="shareResult">
                      <div>
                        <strong>Link ready</strong>
                        <div class="subtle">Copy it now. The full token is only returned at creation time.</div>
                      </div>
                      <input class="share-link" id="shareUrlOutput" readonly />
                      <div class="actions">
                        <button class="primary" type="button" id="copyShareButton">Copy Link</button>
                        <button class="ghost" type="button" id="shareDoneButton">Done</button>
                      </div>
                    </div>
                  </section>

                  <div id="filesContainer"></div>
                </div>
              </section>
            </section>
    </main>

    <footer class="site-footer">
      <div><strong>BurnBox</strong> © 2026 Contributors. Released as an open-source private R2 drop workspace.</div>
      <div>Technical Support Platform: Cloudflare Workers, R2, and D1.</div>
    </footer>

    ${renderFirstDeployBanner(deployment, appEntryPath)}
    <script>
      const boot = {
        authenticated: true,
        files: ${filesJson},
        owner: ${ownerJson},
        apiBase: ${JSON.stringify(String(apiBase || "/api").replace(/\/+$/, "") || "/api")},
        appEntryPath: ${JSON.stringify(appEntryPath || "/")},
        deployment: ${JSON.stringify(deployment || null)}
      };
      ${clientHelpersScript()}
      ${clientShareScript()}
      ${clientFilesScript()}
      ${clientUploadScript()}
      ${clientBootWiringScript()}
    </script>
  </body>
</html>`;
}
