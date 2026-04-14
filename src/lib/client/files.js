/**
 * Client script: file list rendering and registry refresh.
 *
 * Depends on: helpers.js (apiUrl, escapeHtml, formatBytes, setStatus,
 * currentFiles), share.js (openShareComposer, forgetShareLink,
 * syncStoredShareLinks, renderShareState)
 */
export function script() {
  return `
      function renderFiles(files) {
        const container = document.getElementById("filesContainer");
        if (!container) return;

        if (!files.length) {
          container.innerHTML = \`
            <div class="empty-state">
              <h3>No files yet</h3>
              <p>Upload your first file into the archive. Once it lands in R2, you can generate a temporary share configuration directly inside the workspace.</p>
            </div>
          \`;
          return;
        }

        const rows = files.map((file) => \`
          <tr>
            <td><div class="name-cell">\${escapeHtml(file.filename)}</div></td>
            <td><div class="subtle">\${formatBytes(file.size)}</div></td>
            <td><div class="tag-row">\${(file.tags || []).map((tag) => \`<span class="tag">\${escapeHtml(tag)}</span>\`).join("") || '<span class="subtle">No tags</span>'}</div></td>
            <td><div class="subtle">\${new Date(file.createdAt).toLocaleString()}</div></td>
            <td>\${renderShareState(file)}</td>
            <td>
              <div class="table-actions">
                <button class="secondary" type="button" data-share-file-id="\${escapeHtml(file.id)}" data-share-file-name="\${escapeHtml(file.filename)}">Share</button>
                \${file.activeShare ? \`<button class="ghost" type="button" data-revoke-share-id="\${escapeHtml(file.activeShare.id)}">Revoke</button>\` : ""}
                <button class="danger" type="button" data-file-id="\${escapeHtml(file.id)}">Delete</button>
              </div>
            </td>
          </tr>
        \`).join("");

        container.innerHTML = \`
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Tags</th>
                  <th>Created</th>
                  <th>Share</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>\${rows}</tbody>
            </table>
          </div>
        \`;

        container.querySelectorAll("[data-file-id]").forEach((button) => {
          button.addEventListener("click", async () => {
            const fileId = button.getAttribute("data-file-id");
            if (!confirm("Delete this file and revoke related shares?")) return;

            setStatus("Deleting file...", false, "Removing the object and clearing linked access.");
            const response = await fetch(apiUrl(\`/files/\${fileId}\`), { method: "DELETE" });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              setStatus(data.error || "Failed to delete file.", true);
              return;
            }

            await refreshFiles();
            setStatus("File deleted.", false, "The file and its linked share capability are gone.");
          });
        });

        container.querySelectorAll("[data-share-file-id]").forEach((button) => {
          button.addEventListener("click", () => {
            openShareComposer(
              button.getAttribute("data-share-file-id"),
              button.getAttribute("data-share-file-name"),
            );
          });
        });

        container.querySelectorAll("[data-revoke-share-id]").forEach((button) => {
          button.addEventListener("click", async () => {
            const shareId = button.getAttribute("data-revoke-share-id");
            setStatus("Revoking share...", false, "The link will stop working immediately.");
            const response = await fetch(apiUrl(\`/shares/\${shareId}/revoke\`), { method: "POST" });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              setStatus(data.error || "Failed to revoke share.", true);
              return;
            }

            forgetShareLink(shareId);
            await refreshFiles();
            setStatus("Share revoked.", false, "External access has been destroyed.");
          });
        });

        container.querySelectorAll("[data-copy-share-url]").forEach((button) => {
          button.addEventListener("click", async () => {
            const url = button.getAttribute("data-copy-share-url") || "";
            if (!url) {
              setStatus("This share URL is not available.", true);
              return;
            }

            try {
              if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
              }
              setStatus("Share link copied.", false, "The active link is now in your clipboard.");
            } catch {
              setStatus("Clipboard access failed.", true);
            }
          });
        });
      }

      async function refreshFiles() {
        setStatus("Refreshing registry...", false, "Loading the latest file and share state.");
        const response = await fetch(apiUrl("/files"));
        if (!response.ok) {
          setStatus("Failed to load files.", true);
          return;
        }

        const data = await response.json();
        currentFiles = Array.isArray(data.files) ? data.files : [];
        syncStoredShareLinks(currentFiles);
        renderFiles(currentFiles);
        setStatus("Workspace ready.", false, \`\${currentFiles.length} file(s) currently in the registry.\`);
      }
  `;
}
