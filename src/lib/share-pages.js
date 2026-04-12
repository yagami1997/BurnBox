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
    missing: {
      statusCode: 404,
      title: "Invalid link",
      description: "The requested resource could not be located. Verify the address and try again.",
      detail: "The link is invalid or no longer resolves to an available resource.",
    },
    revoked: {
      statusCode: 410,
      title: "Resource expired",
      description: "The requested resource is no longer available.",
      detail: "This link has expired or can no longer be used.",
    },
    expired: {
      statusCode: 410,
      title: "Resource expired",
      description: "The requested resource is no longer available.",
      detail: "This link has expired or can no longer be used.",
    },
    depleted: {
      statusCode: 410,
      title: "Resource expired",
      description: "The requested resource is no longer available.",
      detail: "This link has expired or can no longer be used.",
    },
    missing_object: {
      statusCode: 503,
      title: "Service unavailable",
      description: "The requested resource is temporarily unavailable.",
      detail: "The origin resource is not currently available. Try again later.",
    },
    unavailable: {
      statusCode: 503,
      title: "Service unavailable",
      description: "The requested resource is temporarily unavailable.",
      detail: "The request could not be completed at this time. Try again later.",
    },
  }[status] || {
    statusCode: 503,
    title: "Service unavailable",
    description: "The requested resource is temporarily unavailable.",
    detail: "The request could not be completed at this time. Try again later.",
  };

  return renderInfrastructureErrorPage(copy);
}

export function renderPublicHostUnavailablePage(options = {}) {
  const statusCode = Number.isFinite(options.status) ? Number(options.status) : 503;
  const copy = statusCode === 404
    ? {
        statusCode: 404,
        title: "Not Found",
        description: "The requested resource could not be located.",
        detail: "The address may be invalid, incomplete, or no longer available.",
      }
    : {
        statusCode: 503,
        title: "Fatal server error",
        description: "The server is unavailable due to a fatal internal failure.",
        detail: "A critical service error caused the endpoint to go offline. Please try again later.",
      };

  return renderInfrastructureErrorPage(copy);
}

function renderInfrastructureErrorPage({ statusCode, title, description, detail }) {
  const accent = statusCode >= 500 ? "#f38020" : statusCode === 410 ? "#d97706" : "#f38020";
  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            background: #ffffff;
            color: #222222;
            font-family: Arial, Helvetica, sans-serif;
          }
          .shell {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 28px 20px;
          }
          main {
            width: min(860px, 100%);
            border: 1px solid #d9d9d9;
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
            overflow: hidden;
          }
          .bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 20px;
            border-bottom: 1px solid #d9d9d9;
            background: #f7f7f7;
            font-size: 0.94rem;
            color: #5a5a5a;
          }
          .bar strong {
            color: #2b2b2b;
            font-weight: 600;
          }
          .body {
            padding: 34px 34px 30px;
          }
          .status-code {
            display: inline-block;
            margin-bottom: 14px;
            color: ${accent};
            font-size: 1rem;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }
          h1 {
            margin: 0 0 12px;
            font-size: clamp(2.2rem, 7vw, 4.2rem);
            font-weight: 600;
            letter-spacing: -0.04em;
          }
          p {
            margin: 0;
            color: #4c4c4c;
            font-size: 1.03rem;
            line-height: 1.62;
            max-width: 640px;
          }
          .detail {
            margin-top: 14px;
            color: #6a6a6a;
            font-size: 0.97rem;
            max-width: 660px;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 14px;
            margin-top: 30px;
          }
          .meta-card {
            padding: 16px 18px;
            border: 1px solid #e2e2e2;
            border-radius: 6px;
            background: #fafafa;
          }
          .meta-label {
            display: block;
            margin-bottom: 8px;
            color: #7a7a7a;
            font-size: 0.76rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }
          .meta-value {
            display: block;
            color: #202020;
            font-size: 1rem;
            line-height: 1.45;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            padding: 16px 20px 18px;
            border-top: 1px solid #e2e2e2;
            background: #fafafa;
            color: #7a7a7a;
            font-size: 0.9rem;
          }
          .brand {
            color: #f38020;
            font-weight: 700;
            letter-spacing: 0.02em;
          }
        </style>
      </head>
      <body>
        <div class="shell">
          <main>
            <div class="bar">
              <strong>Request failed</strong>
              <span>HTTP ${escapeHtml(String(statusCode))}</span>
            </div>
            <div class="body">
              <div class="status-code">Error ${escapeHtml(String(statusCode))}</div>
              <h1>${escapeHtml(title)}</h1>
              <p>${escapeHtml(description)}</p>
              <p class="detail">${escapeHtml(detail)}</p>
              <div class="meta">
                <div class="meta-card">
                  <span class="meta-label">Status</span>
                  <span class="meta-value">${escapeHtml(String(statusCode))}</span>
                </div>
                <div class="meta-card">
                  <span class="meta-label">Classification</span>
                  <span class="meta-value">${escapeHtml(title)}</span>
                </div>
              </div>
            </div>
            <div class="footer">
              <span>Performance & security by <span class="brand">Cloudflare</span></span>
              <span>Reference ${escapeHtml(String(statusCode))}</span>
            </div>
          </main>
        </div>
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
