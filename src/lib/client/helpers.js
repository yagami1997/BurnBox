/**
 * Client script: global state, DOM references, and shared helper functions.
 *
 * Returns a JS string fragment that runs in the browser page scope.
 * All identifiers declared here are available to subsequent script modules.
 */
export function script() {
  return `
      let currentFiles = Array.isArray(boot.files) ? [...boot.files] : [];
      const shareLinkStorageKey = "burnbox_share_links_v1";
      let statusResetTimer = null;

      const statusText = document.getElementById("statusText");
      const statusSubtext = document.getElementById("statusSubtext");
      const statusBanner = document.getElementById("statusBanner");
      const shareComposer = document.getElementById("shareComposer");
      const shareForm = document.getElementById("shareForm");
      const shareResult = document.getElementById("shareResult");
      const shareUrlOutput = document.getElementById("shareUrlOutput");
      const shareTargetName = document.getElementById("shareTargetName");
      const limitDownloadsToggle = document.getElementById("limitDownloadsToggle");
      const shareDownloadsField = document.getElementById("shareDownloadsField");
      const uploadProgress = document.getElementById("uploadProgress");
      const uploadProgressBar = document.getElementById("uploadProgressBar");
      const uploadProgressLabel = document.getElementById("uploadProgressLabel");
      const uploadProgressValue = document.getElementById("uploadProgressValue");
      const uploadProgressSub = document.getElementById("uploadProgressSub");

      function apiUrl(path) {
        return boot.apiBase + path;
      }

      function formatBytes(value) {
        if (!value) return "0 B";
        const units = ["B", "KB", "MB", "GB"];
        let size = Number(value);
        let unit = 0;
        while (size >= 1024 && unit < units.length - 1) {
          size /= 1024;
          unit += 1;
        }
        return \`\${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} \${units[unit]}\`;
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      function scheduleReadyStatus() {
        if (statusResetTimer) {
          clearTimeout(statusResetTimer);
        }

        statusResetTimer = setTimeout(() => {
          setStatus("Workspace ready.", false, \`\${currentFiles.length} file(s) currently in the registry.\`);
        }, 3200);
      }

      function setStatus(message, isError = false, detail = "") {
        if (statusResetTimer) {
          clearTimeout(statusResetTimer);
          statusResetTimer = null;
        }
        if (statusText) statusText.textContent = message;
        if (statusSubtext) statusSubtext.textContent = detail || (isError ? "Review the last action and try again." : "Upload, issue controlled links, revoke when needed.");
        if (statusBanner) statusBanner.classList.toggle("error", Boolean(isError));
        if (!isError && message !== "Workspace ready.") {
          scheduleReadyStatus();
        }
      }

      function setUploadProgress(progress, label, detail, mode = "uploading") {
        if (!uploadProgress || !uploadProgressBar || !uploadProgressLabel || !uploadProgressValue || !uploadProgressSub) {
          return;
        }

        const clamped = Math.max(0, Math.min(100, Number(progress || 0)));
        uploadProgress.classList.remove("hidden");
        uploadProgress.classList.toggle("is-finalizing", mode === "finalizing");
        uploadProgressBar.style.width = \`\${clamped}%\`;
        uploadProgressLabel.textContent = label || "Upload progress";
        uploadProgressValue.textContent = mode === "finalizing" ? "Finalizing" : \`\${Math.round(clamped)}%\`;
        uploadProgressSub.textContent = detail || "Uploading.";
      }

      function clearUploadProgress() {
        if (!uploadProgress || !uploadProgressBar || !uploadProgressLabel || !uploadProgressValue || !uploadProgressSub) {
          return;
        }

        uploadProgress.classList.add("hidden");
        uploadProgress.classList.remove("is-finalizing");
        uploadProgressBar.style.width = "0%";
        uploadProgressLabel.textContent = "Upload progress";
        uploadProgressValue.textContent = "0%";
        uploadProgressSub.textContent = "Waiting for a file.";
      }
  `;
}
