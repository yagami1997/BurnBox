/**
 * Client script: share link storage and share UI (composer, revoke, copy).
 *
 * Depends on: helpers.js (apiUrl, escapeHtml, setStatus, shareComposer,
 * shareForm, shareResult, shareUrlOutput, shareTargetName,
 * limitDownloadsToggle, shareDownloadsField, shareLinkStorageKey)
 */
export function script() {
  return `
      function readStoredShareLinks() {
        try {
          const raw = localStorage.getItem(shareLinkStorageKey);
          return raw ? JSON.parse(raw) : {};
        } catch {
          return {};
        }
      }

      function writeStoredShareLinks(value) {
        try {
          localStorage.setItem(shareLinkStorageKey, JSON.stringify(value));
        } catch {
          // Ignore storage failures.
        }
      }

      let storedShareLinks = readStoredShareLinks();

      function rememberShareLink(shareId, url) {
        if (!shareId || !url) return;
        storedShareLinks[shareId] = url;
        writeStoredShareLinks(storedShareLinks);
      }

      function forgetShareLink(shareId) {
        if (!shareId || !storedShareLinks[shareId]) return;
        delete storedShareLinks[shareId];
        writeStoredShareLinks(storedShareLinks);
      }

      function syncStoredShareLinks(files) {
        const activeIds = new Set(
          files
            .map((file) => file.activeShare?.id)
            .filter(Boolean),
        );

        for (const file of files) {
          if (file.activeShare?.id && file.activeShare?.url) {
            storedShareLinks[file.activeShare.id] = file.activeShare.url;
          }
        }

        let changed = false;
        for (const shareId of Object.keys(storedShareLinks)) {
          if (!activeIds.has(shareId)) {
            delete storedShareLinks[shareId];
            changed = true;
          }
        }

        if (changed || files.some((file) => file.activeShare?.id && file.activeShare?.url)) {
          writeStoredShareLinks(storedShareLinks);
        }
      }

      function renderShareState(file) {
        if (!file.activeShare) {
          return '<div class="share-state inactive"><strong>Not shared</strong><span>No active temporary link</span></div>';
        }

        const usage = file.activeShare.maxDownloads === null
          ? "Unlimited download budget"
          : \`\${file.activeShare.downloadCount} of \${file.activeShare.maxDownloads} consumed\`;
        const noExpiration = file.activeShare.expiresAt === "9999-12-31T23:59:59.999Z";
        const expiryLabel = noExpiration
          ? "No expiration"
          : new Date(file.activeShare.expiresAt).toLocaleString();
        const shareUrl = file.activeShare.url || storedShareLinks[file.activeShare.id] || "";

        return \`
          <div class="share-state">
            <strong>\${noExpiration ? expiryLabel : \`Live until \${expiryLabel}\`}</strong>
            <span class="subtle">\${usage}</span>
            \${shareUrl ? \`<div class="share-state-actions"><button class="link-mini" type="button" data-copy-share-url="\${escapeHtml(shareUrl)}">Copy link</button></div>\` : ""}
          </div>
        \`;
      }

      function closeShareComposer() {
        if (!shareComposer) return;
        shareComposer.classList.remove("active");
        shareForm?.reset();
        if (limitDownloadsToggle) limitDownloadsToggle.checked = true;
        if (shareDownloadsField) shareDownloadsField.classList.remove("hidden");
        if (shareResult) shareResult.classList.remove("active");
        if (shareUrlOutput) shareUrlOutput.value = "";
      }

      function openShareComposer(fileId, fileName) {
        if (!shareComposer) return;
        document.getElementById("shareFileId").value = fileId;
        shareTargetName.textContent = fileName;
        shareComposer.classList.add("active");
        shareResult.classList.remove("active");
        shareUrlOutput.value = "";
        shareComposer.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      async function copyShareLink() {
        if (!shareUrlOutput?.value) return;
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrlOutput.value);
        }
        setStatus("Share link copied.", false, "The generated URL is now in your clipboard.");
      }
  `;
}
