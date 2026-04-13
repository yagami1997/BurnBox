function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderAuthPage({ view, ownerEmail = "", claimCodeRequired = true }) {
  const boot = JSON.stringify({ view, ownerEmail, claimCodeRequired }).replaceAll("<", "\\u003c");
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
        --sand-panel: rgba(230, 194, 127, 0.94);
        --cream: #fbfaf6;
        --ink: #273547;
        --muted: #4f6274;
        --line: rgba(20, 50, 82, 0.14);
        --danger: #9f1713;
        --success: #214e3c;
        --shadow: 0 24px 60px rgba(20, 50, 82, 0.16);
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        color: var(--ink);
        background: linear-gradient(180deg, var(--sky) 0%, #e7f5fb 100%);
      }
      button, input { font: inherit; }
      .topbar {
        background: linear-gradient(180deg, var(--navy) 0%, #173a5f 100%);
        color: white;
        padding: 22px 20px 26px;
      }
      .topbar-inner, .shell {
        width: min(1120px, calc(100% - 24px));
        margin: 0 auto;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        font-size: clamp(2rem, 5vw, 3rem);
        font-weight: 700;
        letter-spacing: -0.04em;
      }
      .brand-mark {
        width: 42px;
        height: 42px;
        flex: 0 0 auto;
      }
      .tagline {
        margin-top: 8px;
        color: rgba(222, 235, 248, 0.86);
      }
      .shell {
        margin: 24px auto 40px;
      }
      .layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      .panel {
        padding: 28px;
        border-radius: 28px;
        background: var(--sand-panel);
        box-shadow: var(--shadow);
      }
      .panel.cool {
        background: rgba(250, 252, 253, 0.78);
      }
      .stack {
        display: grid;
        gap: 16px;
      }
      .field {
        display: grid;
        gap: 8px;
      }
      label {
        font-size: 0.92rem;
        color: var(--navy-soft);
      }
      input {
        width: 100%;
        padding: 13px 14px;
        border-radius: 14px;
        border: 1px solid rgba(20, 50, 82, 0.16);
        background: rgba(255, 255, 255, 0.92);
      }
      button {
        padding: 13px 18px;
        border-radius: 999px;
        border: none;
        cursor: pointer;
      }
      button.primary {
        background: var(--navy);
        color: white;
      }
      button.ghost {
        background: rgba(20, 50, 82, 0.08);
        color: var(--navy);
      }
      h1, h2 { margin: 0; }
      p { color: var(--muted); line-height: 1.5; }
      .status {
        margin-top: 18px;
        padding: 16px 18px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.66);
        border: 1px solid rgba(20, 50, 82, 0.1);
      }
      .status.error {
        background: rgba(159, 23, 19, 0.08);
        border-color: rgba(159, 23, 19, 0.18);
      }
      .status-main { font-weight: 600; }
      .status-sub {
        margin-top: 6px;
        color: var(--muted);
        font-size: 0.92rem;
      }
      .sub-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 8px;
      }
      .codes {
        display: none;
        margin-top: 18px;
        padding: 16px 18px;
        border-radius: 18px;
        background: rgba(20, 50, 82, 0.05);
        border: 1px dashed rgba(20, 50, 82, 0.18);
        white-space: pre-wrap;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .codes.active { display: block; }
      .hidden { display: none; }
      .muted-list {
        display: grid;
        gap: 10px;
        margin-top: 16px;
      }
      .muted-list div {
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(255,255,255,0.52);
      }
      @media (max-width: 900px) {
        .layout { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
            <path fill="#ffffff" d="M34 4c2 7 7 12 12 17 6 6 9 13 9 20 0 13-9 23-23 23S9 54 9 41c0-9 5-16 11-22 5-5 10-9 12-17 0-2 1-2 2 0z"></path>
            <path fill="#173a5f" d="M35 14c1 5 5 8 8 11 4 4 6 8 6 13 0 8-6 14-14 14s-14-6-14-14c0-5 2-9 6-13 3-3 6-6 8-11z"></path>
            <path fill="#c23a2b" d="M35 27c1 3 3 5 5 7 2 2 3 4 3 7 0 5-4 9-9 9s-9-4-9-9c0-4 2-6 4-8 3-2 5-4 6-6z"></path>
          </svg>
          <span>BurnBox</span>
        </div>
        <div class="tagline">Private R2 drop with owner claim and controlled sharing.</div>
      </div>
    </header>

    <main class="shell">
      <section class="layout">
        <section class="panel">
          ${renderPrimaryPanel(view, ownerEmail, claimCodeRequired)}
          <div class="status" id="statusBanner">
            <div class="status-main" id="statusText">${initialStatus(view).main}</div>
            <div class="status-sub" id="statusSubtext">${initialStatus(view).sub}</div>
          </div>
          <pre class="codes" id="recoveryCodesBox"></pre>
          <div class="sub-actions">
            <button class="primary hidden" type="button" id="continueButton">Enter workspace</button>
          </div>
        </section>

        <section class="panel cool">
          <h2>${sideCopy(view).title}</h2>
          <p>${sideCopy(view).body}</p>
          <div class="muted-list">
            ${sideCopy(view).items.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}
          </div>
        </section>
      </section>
    </main>

    <script>
      const boot = ${boot};
      const statusBanner = document.getElementById("statusBanner");
      const statusText = document.getElementById("statusText");
      const statusSubtext = document.getElementById("statusSubtext");
      const recoveryCodesBox = document.getElementById("recoveryCodesBox");
      const continueButton = document.getElementById("continueButton");

      function setStatus(message, isError = false, detail = "") {
        if (statusText) statusText.textContent = message;
        if (statusSubtext) statusSubtext.textContent = detail || "";
        if (statusBanner) statusBanner.classList.toggle("error", Boolean(isError));
      }

      function showRecoveryCodes(codes) {
        if (!recoveryCodesBox || !Array.isArray(codes) || !codes.length) return;
        recoveryCodesBox.textContent = codes.join("\\n");
        recoveryCodesBox.classList.add("active");
        continueButton?.classList.remove("hidden");
      }

      async function postJson(url, body) {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Request failed");
        }
        return data;
      }

      document.getElementById("claimForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const body = {
          claimCode: form.claimCode?.value || "",
          email: form.email.value,
          password: form.password.value,
          confirmPassword: form.confirmPassword.value,
        };
        if (body.password !== body.confirmPassword) {
          setStatus("Passwords do not match.", true, "Use the same password in both fields.");
          return;
        }
        setStatus("Claiming workspace...", false, "Creating the owner account and recovery codes.");
        try {
          const data = await postJson("/api/auth/claim", body);
          showRecoveryCodes(data.recoveryCodes);
          setStatus("Workspace claimed.", false, "Recovery codes are shown below. Save them, then enter the workspace.");
        } catch (error) {
          setStatus(String(error.message || error), true, "Check the claim code and try again.");
        }
      });

      document.getElementById("legacyLoginForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const password = event.currentTarget.password.value;
        setStatus("Signing in...", false, "Verifying the legacy password so the workspace can be upgraded.");
        try {
          await postJson("/api/auth/login", { password });
          location.reload();
        } catch (error) {
          setStatus(String(error.message || error), true, "The legacy password did not match.");
        }
      });

      document.getElementById("upgradeForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const body = {
          email: form.email.value,
          password: form.password.value,
          confirmPassword: form.confirmPassword.value,
        };
        if (body.password !== body.confirmPassword) {
          setStatus("Passwords do not match.", true, "Use the same password in both fields.");
          return;
        }
        setStatus("Completing upgrade...", false, "Creating the owner account and switching BurnBox to the new auth model.");
        try {
          const data = await postJson("/api/auth/upgrade", body);
          showRecoveryCodes(data.recoveryCodes);
          setStatus("Upgrade complete.", false, "Recovery codes are shown below. Save them, then enter the workspace.");
        } catch (error) {
          setStatus(String(error.message || error), true, "Review the email and password, then try again.");
        }
      });

      document.getElementById("ownerLoginForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        setStatus("Signing in...", false, "Verifying the owner account and issuing a signed session.");
        try {
          await postJson("/api/auth/login", {
            email: form.email.value,
            password: form.password.value,
          });
          location.reload();
        } catch (error) {
          setStatus(String(error.message || error), true, "Check the email and password or use a recovery code.");
        }
      });

      document.getElementById("recoveryForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const body = {
          email: form.email.value,
          recoveryCode: form.recoveryCode.value,
          newPassword: form.newPassword.value,
          confirmPassword: form.confirmPassword.value,
        };
        if (body.newPassword !== body.confirmPassword) {
          setStatus("Passwords do not match.", true, "Use the same new password in both fields.");
          return;
        }
        setStatus("Resetting password...", false, "Verifying the recovery code and updating the owner password.");
        try {
          await postJson("/api/auth/recover-with-code", body);
          setStatus("Password reset complete.", false, "Use the new password to sign in.");
          setTimeout(() => location.href = "/", 1400);
        } catch (error) {
          setStatus(String(error.message || error), true, "Check the recovery code and try again.");
        }
      });

      document.querySelectorAll("[data-open-recovery]").forEach((button) => {
        button.addEventListener("click", () => {
          location.href = "/recover";
        });
      });
      continueButton?.addEventListener("click", () => {
        location.href = "/";
      });
      document.querySelectorAll("[data-open-login]").forEach((button) => {
        button.addEventListener("click", () => {
          location.href = "/";
        });
      });
    </script>
  </body>
</html>`;
}

function renderPrimaryPanel(view, ownerEmail, claimCodeRequired) {
  if (view === "claim") {
    return `
      <h1>Claim your BurnBox</h1>
      <p>This workspace is ready. Create the owner account to continue.</p>
      <form class="stack" id="claimForm" style="margin-top:22px;">
        ${claimCodeRequired ? `<div class="field"><label for="claimCode">Claim code</label><input id="claimCode" name="claimCode" type="text" autocomplete="one-time-code" required /></div>` : ""}
        <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required /></div>
        <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="new-password" required /></div>
        <div class="field"><label for="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" required /></div>
        <button class="primary" type="submit">Create owner account</button>
      </form>
    `;
  }

  if (view === "upgrade") {
    return `
      <h1>Upgrade your BurnBox security</h1>
      <p>Finish this one-time upgrade to keep using your workspace.</p>
      <form class="stack" id="upgradeForm" style="margin-top:22px;">
        <div class="field"><label for="email">Owner email</label><input id="email" name="email" type="email" autocomplete="email" value="${escapeHtml(ownerEmail)}" required /></div>
        <div class="field"><label for="password">New password</label><input id="password" name="password" type="password" autocomplete="new-password" required /></div>
        <div class="field"><label for="confirmPassword">Confirm new password</label><input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" required /></div>
        <button class="primary" type="submit">Complete upgrade</button>
      </form>
    `;
  }

  if (view === "login") {
    return `
      <h1>Sign in</h1>
      <p>Use the owner account to enter the workspace.</p>
      <form class="stack" id="ownerLoginForm" style="margin-top:22px;">
        <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" value="${escapeHtml(ownerEmail)}" required /></div>
        <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required /></div>
        <button class="primary" type="submit">Enter workspace</button>
      </form>
      <div class="sub-actions">
        <button class="ghost" type="button" data-open-recovery>Use recovery code</button>
      </div>
    `;
  }

  if (view === "recover") {
    return `
      <h1>Reset with recovery code</h1>
      <p>Use one saved recovery code to set a new owner password.</p>
      <form class="stack" id="recoveryForm" style="margin-top:22px;">
        <div class="field"><label for="email">Owner email</label><input id="email" name="email" type="email" autocomplete="email" value="${escapeHtml(ownerEmail)}" required /></div>
        <div class="field"><label for="recoveryCode">Recovery code</label><input id="recoveryCode" name="recoveryCode" type="text" autocomplete="one-time-code" required /></div>
        <div class="field"><label for="newPassword">New password</label><input id="newPassword" name="newPassword" type="password" autocomplete="new-password" required /></div>
        <div class="field"><label for="confirmPassword">Confirm new password</label><input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" required /></div>
        <button class="primary" type="submit">Reset password</button>
      </form>
      <div class="sub-actions">
        <button class="ghost" type="button" data-open-login>Back to sign in</button>
      </div>
    `;
  }

  return `
    <h1>Sign in to upgrade</h1>
    <p>Use the current workspace password one last time, then move BurnBox to the new owner-account model.</p>
    <form class="stack" id="legacyLoginForm" style="margin-top:22px;">
      <div class="field"><label for="password">Current password</label><input id="password" name="password" type="password" autocomplete="current-password" required /></div>
      <button class="primary" type="submit">Continue upgrade</button>
    </form>
  `;
}

function sideCopy(view) {
  if (view === "claim") {
    return {
      title: "First-run owner claim",
      body: "BurnBox 2.2.0 treats setup as product claim, not as a deployment-password chore.",
      items: [
        "Claim code gates the first owner account.",
        "Recovery codes are generated as part of setup.",
        "After claim, the workspace switches to owner sign-in.",
      ],
    };
  }

  if (view === "upgrade") {
    return {
      title: "One-time security upgrade",
      body: "Legacy workspaces can move into the new auth model without a manual password reset in Cloudflare.",
      items: [
        "Keep using the current workspace until the upgrade completes.",
        "The old deployment password stops being the main auth path.",
        "Owner email, password, and recovery codes become the new baseline.",
      ],
    };
  }

  if (view === "recover") {
    return {
      title: "Recovery path",
      body: "This MVP reset flow uses saved recovery codes instead of forcing database edits or deployment secret changes.",
      items: [
        "Each recovery code works once.",
        "Use a new password after successful recovery.",
        "Regenerate the code set from Account & Security after sign-in.",
      ],
    };
  }

  return {
    title: "Owner account sign-in",
    body: "Normal sign-in stays small: email, password, and a signed owner session. Extra friction only appears when risk rises.",
    items: [
      "Workspace auth now belongs to the product layer.",
      "Password changes and sign-out-all happen in the UI.",
      "Recovery codes provide the no-SMTP fallback.",
    ],
  };
}

function initialStatus(view) {
  if (view === "claim") {
    return {
      main: "Claim the workspace to continue.",
      sub: "Use the claim code from deployment setup or from the first-run logs.",
    };
  }
  if (view === "upgrade") {
    return {
      main: "Complete the one-time upgrade.",
      sub: "This moves BurnBox from the legacy password model into the owner-account model.",
    };
  }
  if (view === "recover") {
    return {
      main: "Use a saved recovery code.",
      sub: "This path exists so you do not have to touch deployment secrets or the database.",
    };
  }
  if (view === "legacy-login") {
    return {
      main: "Sign in with the current password.",
      sub: "BurnBox will immediately guide you into the upgrade flow.",
    };
  }
  return {
    main: "Sign in with the owner account.",
    sub: "Password changes, recovery, and device controls now live inside the workspace.",
  };
}
