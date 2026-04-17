/**
 * Client script: page initialisation and event listener wiring.
 *
 * Runs after all other modules are defined. Wires up:
 *   - initial render
 *   - last-login timestamp display
 *   - Refresh / Logout buttons
 *   - Account security panel toggles (sign-out-all, change-password,
 *     recovery-email, recovery-codes)
 *   - Share composer (open, close, copy, submit)
 *   - Upload form
 *
 * Depends on: helpers.js, share.js, files.js, upload.js
 */
export function script() {
  return `
      // --- Incomplete-upload localStorage helpers ---
      const INCOMPLETE_UPLOAD_KEY = "burnbox_incomplete_upload";

      function saveIncompleteUpload(initData, filename, fileSize) {
        try {
          localStorage.setItem(INCOMPLETE_UPLOAD_KEY, JSON.stringify({
            fileId: initData.fileId,
            chunkSize: initData.chunkSize,
            totalParts: initData.totalParts,
            storageKey: initData.storageKey,
            filename,
            fileSize,
            savedAt: new Date().toISOString(),
          }));
        } catch { /* quota or private-mode — non-fatal */ }
      }

      function clearIncompleteUpload() {
        try { localStorage.removeItem(INCOMPLETE_UPLOAD_KEY); } catch { /* ignore */ }
      }

      function loadIncompleteUpload() {
        try {
          const raw = localStorage.getItem(INCOMPLETE_UPLOAD_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      }

      // --- Resume banner ---
      function renderResumeBanner(pending) {
        const existing = document.getElementById("resumeBanner");
        if (existing) existing.remove();

        const banner = document.createElement("div");
        banner.id = "resumeBanner";
        banner.className = "notification is-warning is-light";
        banner.style.cssText = "margin-bottom:1rem;display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;";

        const sizeLabel = pending.fileSize > 0
          ? \` (\${Math.round(pending.fileSize / 1024 / 1024)} MiB)\`
          : "";
        const msg = document.createElement("span");
        msg.style.flex = "1";
        msg.textContent = \`Incomplete upload detected: \${pending.filename}\${sizeLabel}. Select the same file in the form below to resume.\`;

        const dismissBtn = document.createElement("button");
        dismissBtn.className = "button is-light is-small";
        dismissBtn.textContent = "Dismiss";
        dismissBtn.addEventListener("click", async () => {
          dismissBtn.disabled = true;
          try {
            await abortUpload(pending.fileId);
            clearIncompleteUpload();
            banner.remove();
          } catch {
            dismissBtn.disabled = false;
            const existing = banner.querySelector(".dismiss-error");
            if (!existing) {
              const errMsg = document.createElement("span");
              errMsg.className = "dismiss-error";
              errMsg.style.cssText = "color:#c0392b;font-size:0.85em;width:100%;";
              errMsg.textContent = "Server cleanup failed — try again or refresh the page.";
              banner.appendChild(errMsg);
            }
          }
        });

        banner.append(msg, dismissBtn);

        const uploadForm = document.getElementById("uploadForm");
        if (uploadForm?.parentNode) {
          uploadForm.parentNode.insertBefore(banner, uploadForm);
        } else {
          document.querySelector("main, .container, body")?.prepend(banner);
        }
      }

      {
        renderFiles(currentFiles);
        setStatus("Workspace ready.", false, \`\${currentFiles.length} file(s) currently in the registry.\`);

        // Show resume banner if there's a pending upload from a previous session.
        const pendingUpload = loadIncompleteUpload();
        if (pendingUpload?.fileId) {
          renderResumeBanner(pendingUpload);
        }

        const lastLoginDisplay = document.getElementById("lastLoginDisplay");
        if (lastLoginDisplay?.dataset.iso) {
          const raw = lastLoginDisplay.dataset.iso;
          const value = new Date(raw);
          if (!Number.isNaN(value.getTime())) {
            const pad = (part) => String(part).padStart(2, "0");
            const year = value.getFullYear();
            const month = pad(value.getMonth() + 1);
            const day = pad(value.getDate());
            const hours = pad(value.getHours());
            const minutes = pad(value.getMinutes());
            const offsetMinutes = -value.getTimezoneOffset();
            const sign = offsetMinutes >= 0 ? "+" : "-";
            const absOffset = Math.abs(offsetMinutes);
            const offsetHours = pad(Math.floor(absOffset / 60));
            const offsetRemainder = pad(absOffset % 60);
            lastLoginDisplay.textContent = "Signed in on "
              + year
              + "-"
              + month
              + "-"
              + day
              + " at "
              + hours
              + ":"
              + minutes
              + " (UTC"
              + sign
              + offsetHours
              + ":"
              + offsetRemainder
              + ")";
          }
        }

        document.getElementById("refreshButton")?.addEventListener("click", refreshFiles);
        document.getElementById("logoutButton")?.addEventListener("click", async () => {
          await fetch(apiUrl("/auth/logout"), { method: "POST" });
          location.href = boot.appEntryPath;
        });

        const signOutAllButton = document.getElementById("signOutAllButton");
        signOutAllButton?.addEventListener("click", async () => {
          const originalLabel = signOutAllButton.textContent;
          signOutAllButton.disabled = true;
          setStatus("Resetting device sessions...", false, "Other signed-in devices will need to authenticate again.");
          const response = await fetch(apiUrl("/auth/sign-out-all"), { method: "POST" });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            signOutAllButton.disabled = false;
            setStatus(data.error || "Failed to reset device sessions.", true);
            return;
          }
          signOutAllButton.textContent = "Other Devices Signed Out";
          signOutAllButton.classList.add("is-success");
          setStatus("Other devices signed out.", false, "This current workspace stayed active with the latest session.");
          window.setTimeout(() => {
            signOutAllButton.textContent = originalLabel;
            signOutAllButton.classList.remove("is-success");
            signOutAllButton.disabled = false;
          }, 2200);
        });

        const changePasswordForm = document.getElementById("changePasswordPanel");
        const recoveryEmailForm = document.getElementById("recoveryEmailPanel");
        const recoveryCodesForm = document.getElementById("recoveryCodesPanel");
        const recoveryEmailDisplay = document.getElementById("recoveryEmailDisplay");
        const toggleRecoveryEmailFormButton = document.getElementById("toggleRecoveryEmailForm");
        const recoveryEmailInput = document.getElementById("recoveryEmailInput");
        const closePanels = () => {
          changePasswordForm?.classList.remove("active");
          recoveryEmailForm?.classList.remove("active");
          recoveryCodesForm?.classList.remove("active");
        };

        document.getElementById("toggleRecoveryCodes")?.addEventListener("click", () => {
          const willOpen = !recoveryCodesForm?.classList.contains("active");
          closePanels();
          if (willOpen) {
            recoveryCodesForm?.classList.add("active");
          }
        });
        document.getElementById("toggleRecoveryEmailForm")?.addEventListener("click", () => {
          const willOpen = !recoveryEmailForm?.classList.contains("active");
          closePanels();
          if (willOpen) {
            recoveryEmailForm?.classList.add("active");
            recoveryEmailInput?.focus();
          }
        });
        document.getElementById("closeRecoveryEmailForm")?.addEventListener("click", () => {
          recoveryEmailForm?.classList.remove("active");
        });
        document.getElementById("closeRecoveryCodesForm")?.addEventListener("click", () => {
          recoveryCodesForm?.classList.remove("active");
        });
        document.getElementById("togglePasswordForm")?.addEventListener("click", () => {
          const willOpen = !changePasswordForm?.classList.contains("active");
          closePanels();
          if (willOpen) {
            changePasswordForm?.classList.add("active");
          }
        });
        document.getElementById("closePasswordForm")?.addEventListener("click", () => {
          changePasswordForm?.classList.remove("active");
        });

        document.getElementById("shareComposerClose")?.addEventListener("click", closeShareComposer);
        document.getElementById("copyShareButton")?.addEventListener("click", copyShareLink);
        document.getElementById("shareDoneButton")?.addEventListener("click", closeShareComposer);

        limitDownloadsToggle?.addEventListener("change", () => {
          shareDownloadsField.classList.toggle("hidden", !limitDownloadsToggle.checked);
        });

        shareForm?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const fileId = document.getElementById("shareFileId").value;
          const expiresRaw = document.getElementById("shareExpiry").value;
          const expiresInHours = expiresRaw === "null" ? null : Number(expiresRaw);
          const maxDownloads = limitDownloadsToggle.checked
            ? Number(document.getElementById("shareDownloads").value)
            : null;

          if (limitDownloadsToggle.checked && (!Number.isInteger(maxDownloads) || maxDownloads <= 0)) {
            setStatus("Download limit must be a positive integer.", true);
            return;
          }

          setStatus("Creating share...", false, "Generating a controlled external access window.");
          const response = await fetch(apiUrl(\`/files/\${fileId}/shares\`), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ expiresInHours, maxDownloads })
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            setStatus(data.error || "Failed to create share.", true);
            return;
          }

          rememberShareLink(data.share?.id, data.shareUrl);
          shareUrlOutput.value = data.shareUrl;
          shareResult.classList.add("active");
          try {
            await copyShareLink();
          } catch {
            setStatus("Share created.", false, "Clipboard access was blocked. Copy the link manually below.");
          }
          await refreshFiles();
        });

        document.getElementById("changePasswordPanel")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          if (form.newPassword.value !== form.confirmNewPassword.value) {
            setStatus("Passwords do not match.", true, "Use the same new password in both fields.");
            return;
          }

          setStatus("Updating password...", false, "Saving the new owner password and refreshing the current session.");
          const response = await fetch(apiUrl("/auth/change-password"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              currentPassword: form.currentPassword.value,
              newPassword: form.newPassword.value,
              confirmPassword: form.confirmNewPassword.value,
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            setStatus(data.error || "Failed to update password.", true);
            return;
          }

          form.reset();
          closePanels();
          setStatus("Password updated.", false, "Other sessions now need to sign in again.");
        });

        document.getElementById("recoveryEmailPanel")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const nextRecoveryEmail = form.recoveryEmail.value.trim();
          setStatus("Saving recovery email...", false, nextRecoveryEmail
            ? "Updating the recovery email stored for this workspace."
            : "Removing the stored recovery email from this workspace.");
          const response = await fetch(apiUrl("/auth/recovery-email"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              recoveryEmail: nextRecoveryEmail,
              currentPassword: form.currentPassword.value,
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            setStatus(data.error || "Failed to update recovery email.", true);
            return;
          }

          if (recoveryEmailDisplay) {
            recoveryEmailDisplay.textContent = data.owner?.recoveryEmail || "No recovery email added";
          }
          if (toggleRecoveryEmailFormButton) {
            toggleRecoveryEmailFormButton.textContent = data.owner?.recoveryEmail ? "Edit" : "Add";
          }
          form.currentPassword.value = "";
          closePanels();
          setStatus("Recovery email updated.", false, data.owner?.recoveryEmail
            ? "The workspace now has a recovery email on file."
            : "No recovery email is stored for this workspace.");
        });

        document.getElementById("recoveryCodesPanel")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          setStatus("Regenerating recovery codes...", false, "Replacing the current fallback code set.");
          const response = await fetch(apiUrl("/auth/recovery-codes/regenerate"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              currentPassword: form.currentPassword.value,
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            setStatus(data.error || "Failed to regenerate recovery codes.", true);
            return;
          }

          form.reset();
          const output = document.getElementById("recoveryCodesOutputPanel");
          if (output) {
            output.value = Array.isArray(data.recoveryCodes) ? data.recoveryCodes.join("\\n") : "";
            output.classList.add("active");
          }
          setStatus("Recovery codes refreshed.", false, "Save the new set before closing the workspace.");
        });

        document.getElementById("uploadForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const file = document.getElementById("fileInput")?.files?.[0];
          if (!file) {
            setStatus("Choose a file first.", true);
            return;
          }

          const tags = document.getElementById("tagsInput")?.value || "";
          const note = document.getElementById("noteInput")?.value || "";
          clearUploadProgress();

          // Check if this file matches a pending incomplete upload — resume if so.
          let initData;
          const pendingUpload = loadIncompleteUpload();
          if (pendingUpload?.fileId && pendingUpload.filename === file.name && pendingUpload.fileSize === file.size) {
            initData = pendingUpload;
            document.getElementById("resumeBanner")?.remove();
            setStatus("Resuming upload...", false, \`Matched pending upload — querying server for confirmed parts.\`);
          } else {
            setStatus("Preparing upload...", false, "Creating a signed direct-upload plan.");
            const initResponse = await fetch(apiUrl("/files/init-upload"), {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                filename: file.name,
                size: file.size,
                contentType: file.type || "application/octet-stream"
              })
            });

            initData = await initResponse.json().catch(() => ({}));
            if (!initResponse.ok) {
              setStatus(initData.error || "Failed to initialize upload.", true);
              return;
            }

            saveIncompleteUpload(initData, file.name, file.size);
          }

          try {
            await uploadFileInChunks(file, initData);
          } catch (error) {
            try { await abortUpload(initData.fileId); } catch { /* best-effort cleanup */ }
            clearUploadProgress();
            setStatus(String(error?.message || "Failed to upload file chunks."), true);
            return;
          }

          let completeData;
          try {
            setStatus("Finalizing upload...", false, "Completing multipart assembly and writing metadata into D1.");
            setUploadProgress(95, "Upload finished", "All parts are uploaded. Finalizing in R2 and writing the D1 file record.", "finalizing");
            const completeResponse = await fetch(apiUrl("/files/complete-upload"), {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                fileId: initData.fileId,
                tags,
                note
              })
            });

            completeData = await completeResponse.json().catch(() => ({}));
            if (!completeResponse.ok) {
              throw new Error(completeData.error || "Failed to save file record.");
            }
          } catch (error) {
            try { await abortUpload(initData.fileId); } catch { /* best-effort cleanup */ }
            clearIncompleteUpload();
            clearUploadProgress();
            setStatus(String(error?.message || "Failed to save file record."), true);
            return;
          }

          clearIncompleteUpload();

          if (completeData.file) {
            currentFiles = [completeData.file, ...currentFiles.filter((item) => item.id !== completeData.file.id)];
            syncStoredShareLinks(currentFiles);
            renderFiles(currentFiles);
          } else {
            await refreshFiles();
          }

          event.currentTarget.reset();
          setUploadProgress(100, "Upload complete", \`\${file.name} is now stored in your archive.\`);
          setStatus("Upload complete.", false, \`\${file.name} is now stored in your archive.\`);
          setTimeout(() => {
            clearUploadProgress();
          }, 1800);
        });
      }
  `;
}
