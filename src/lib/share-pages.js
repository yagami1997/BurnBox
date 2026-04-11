function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderSharePage({ share, downloadUrl }) {
  const expiresLabel = formatExpiry(share.expires_at);
  const downloadsLabel = formatDownloads(share);
  const sizeLabel = formatFileSize(share.size);

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(share.filename)}</title>
        <style>
          :root {
            --ink: #1d150f;
            --muted: #6f5d4a;
            --line: rgba(50, 32, 16, 0.12);
            --panel: rgba(255, 252, 247, 0.96);
            --panel-soft: rgba(247, 240, 230, 0.94);
            --accent: #183a5f;
            --accent-deep: #122c47;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at top left, rgba(197, 75, 26, 0.18), transparent 30%),
              radial-gradient(circle at bottom right, rgba(79, 98, 84, 0.16), transparent 30%),
              linear-gradient(180deg, #ece4d5, #f7f1e7);
            color: var(--ink);
            font-family: Georgia, "Times New Roman", serif;
            padding: 16px;
          }
          article {
            width: min(760px, calc(100% - 12px));
            padding: 30px;
            border-radius: 32px;
            background: linear-gradient(180deg, var(--panel), var(--panel-soft));
            border: 1px solid var(--line);
            box-shadow: 0 28px 90px rgba(79, 46, 17, 0.14);
          }
          .eyebrow {
            display: inline-flex;
            padding: 9px 14px;
            border-radius: 999px;
            border: 1px solid var(--line);
            color: var(--muted);
            letter-spacing: .12em;
            text-transform: uppercase;
            font-size: .78rem;
          }
          h1 {
            margin: 22px 0 12px;
            font-size: clamp(2.4rem, 8vw, 4.8rem);
            line-height: .92;
            letter-spacing: -.05em;
          }
          p {
            margin: 0;
            color: var(--muted);
            font-size: 1.05rem;
            line-height: 1.45;
            max-width: 580px;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-top: 26px;
          }
          .meta-card {
            padding: 16px 18px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.52);
            border: 1px solid var(--line);
          }
          .meta-label {
            display: block;
            color: var(--muted);
            font-size: 0.76rem;
            letter-spacing: .12em;
            text-transform: uppercase;
          }
          .meta-value {
            display: block;
            margin-top: 8px;
            font-size: 1rem;
            line-height: 1.35;
          }
          .cta-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            align-items: center;
            margin-top: 28px;
          }
          .cta {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 52px;
            padding: 0 22px;
            border-radius: 16px;
            background: linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%);
            color: #fff;
            text-decoration: none;
            font-weight: 600;
            letter-spacing: .01em;
          }
          .note {
            font-size: 0.92rem;
            color: var(--muted);
          }
        </style>
      </head>
      <body>
        <article>
          <div class="eyebrow">Secure share</div>
          <h1>${escapeHtml(share.filename)}</h1>
          <p>A file has been shared with you through a temporary access window. Review the limits below, then start the download when you are ready.</p>
          <div class="meta">
            <div class="meta-card">
              <span class="meta-label">File size</span>
              <span class="meta-value">${escapeHtml(sizeLabel)}</span>
            </div>
            <div class="meta-card">
              <span class="meta-label">Available until</span>
              <span class="meta-value">${escapeHtml(expiresLabel)}</span>
            </div>
            <div class="meta-card">
              <span class="meta-label">Download policy</span>
              <span class="meta-value">${escapeHtml(downloadsLabel)}</span>
            </div>
          </div>
          <div class="cta-row">
            <a class="cta" href="${escapeHtml(downloadUrl)}">Download file</a>
            <span class="note">This action starts a controlled file transfer.</span>
          </div>
        </article>
      </body>
    </html>`;
}

export function renderShareErrorPage(status) {
  const copy = {
    missing: { title: "Share not found", description: "This link does not exist." },
    revoked: { title: "Share revoked", description: "The owner has closed this access window." },
    expired: { title: "Share expired", description: "This temporary access window has expired." },
    depleted: { title: "Download limit reached", description: "This link has no remaining downloads." },
    missing_object: { title: "File unavailable", description: "The storage backend is missing the object for this share." },
    unavailable: { title: "Share unavailable", description: "This share cannot be used right now. Please try again." },
  }[status] || { title: "Unavailable", description: "This share cannot be used right now." };

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(copy.title)}</title>
        <style>
          :root {
            --ink: #1d150f;
            --muted: #6f5d4a;
            --line: rgba(50, 32, 16, 0.12);
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at top left, rgba(197, 75, 26, 0.18), transparent 30%),
              radial-gradient(circle at bottom right, rgba(79, 98, 84, 0.16), transparent 30%),
              linear-gradient(180deg, #ece4d5, #f7f1e7);
            color: var(--ink);
            font-family: Georgia, "Times New Roman", serif;
            padding: 16px;
          }
          article {
            width: min(680px, calc(100% - 12px));
            padding: 30px;
            border-radius: 32px;
            background:
              linear-gradient(180deg, rgba(255, 252, 247, 0.96), rgba(247, 240, 230, 0.94));
            border: 1px solid var(--line);
            box-shadow: 0 28px 90px rgba(79,46,17,.14);
          }
          .eyebrow {
            display: inline-flex;
            padding: 9px 14px;
            border-radius: 999px;
            border: 1px solid var(--line);
            color: var(--muted);
            letter-spacing: .12em;
            text-transform: uppercase;
            font-size: .78rem;
          }
          h1 {
            margin: 22px 0 12px;
            font-size: clamp(2.2rem, 8vw, 4.6rem);
            line-height: .9;
            letter-spacing: -.05em;
          }
          p {
            margin: 0;
            color: var(--muted);
            font-size: 1.06rem;
            line-height: 1.45;
            max-width: 520px;
          }
        </style>
      </head>
      <body>
        <article>
          <div class="eyebrow">Secure share</div>
          <h1>${escapeHtml(copy.title)}</h1>
          <p>${escapeHtml(copy.description)}</p>
        </article>
      </body>
    </html>`;
}

export function renderPublicHostUnavailablePage() {
  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Service unavailable</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #ffffff;
            color: #1f2937;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            padding: 24px;
          }
          main {
            width: min(720px, 100%);
          }
          h1 {
            margin: 0 0 16px;
            font-size: 2.4rem;
            font-weight: 600;
            letter-spacing: -0.03em;
          }
          p {
            margin: 0;
            color: #4b5563;
            font-size: 1rem;
            line-height: 1.6;
            max-width: 560px;
          }
          .code {
            display: inline-block;
            margin-top: 18px;
            color: #6b7280;
            font-size: 0.92rem;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Service unavailable</h1>
          <p>The requested endpoint is temporarily unavailable. Please try again later.</p>
          <span class="code">Error 503</span>
        </main>
      </body>
    </html>`;
}

function formatExpiry(expiresAt) {
  if (expiresAt === "9999-12-31T23:59:59.999Z") {
    return "No scheduled expiry";
  }

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatDownloads(share) {
  if (share.max_downloads === null || share.max_downloads === undefined) {
    return "No download limit";
  }

  const remaining = Math.max(share.max_downloads - share.download_count, 0);
  return `${remaining} remaining of ${share.max_downloads}`;
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size < 0) {
    return "Unknown";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}
