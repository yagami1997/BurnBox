function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderAppPage({ authenticated, files }) {
  const filesJson = JSON.stringify(files).replaceAll("<", "\\u003c");
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
        grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.72fr);
        gap: 28px;
        align-items: end;
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
      }

      .hero-note {
        padding: 18px;
        border-radius: 20px;
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
          <span class="brand-word">BurnBox</span>
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
            <div class="hero-note dark">
              <span class="hero-note-label">Storage model</span>
              <strong>Long-lived archive in R2.</strong>
              <p>The file stays in your bucket. What changes is who can reach it, for how long, and how many times.</p>
            </div>
            <div class="hero-note light">
              <span class="hero-note-label">Access model</span>
              <strong>Temporary links with explicit limits.</strong>
              <p>Create a link, set the window, cap the usage, and revoke it the moment the job is done.</p>
            </div>
          </aside>
        </div>
      </section>

      ${
        authenticated
          ? `<section class="layout app">
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
                    <button class="secondary" type="button" id="logoutButton">Logout</button>
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
            </section>`
          : `<section class="layout auth">
              <section class="panel">
                <h2>Admin Login</h2>
                <p>One private control surface. Public guest upload and token sprawl are gone from this build.</p>
                <form class="stack" id="loginForm" style="margin-top:22px;">
                  <div class="field">
                    <label for="password">Password</label>
                    <input id="password" name="password" type="password" autocomplete="current-password" required />
                  </div>
                  <button class="primary" type="submit">Enter Workspace</button>
                </form>
              </section>

              <section class="panel cool">
                <h2>Scope</h2>
                <p>BurnBox 2.0 is a private R2 entrance with temporary share control. The source file stays; the access window expires.</p>
                <div class="status" id="statusBanner" style="margin-top:20px;">
                  <div class="status-main" id="statusText">Use the admin password to unlock the desk.</div>
                  <div class="status-sub" id="statusSubtext">Signed session, direct R2 upload, D1-backed share controls.</div>
                </div>
                <div class="stats">
                  <div><span>Public upload</span><strong>No</strong></div>
                  <div><span>Persistence</span><strong>Long-term in R2</strong></div>
                  <div><span>Share policy</span><strong>Expire, limit, revoke</strong></div>
                </div>
              </section>
            </section>`
      }
    </main>

    <footer class="site-footer">
      <div><strong>BurnBox</strong> © 2026 Contributors. Released as an open-source private R2 drop workspace.</div>
      <div>Technical Support Platform: Cloudflare Workers, R2, and D1.</div>
    </footer>

    <script>
      const boot = {
        authenticated: ${authenticated ? "true" : "false"},
        files: ${filesJson}
      };
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

      function scheduleReadyStatus() {
        if (statusResetTimer) {
          clearTimeout(statusResetTimer);
        }

        statusResetTimer = setTimeout(() => {
          setStatus("Workspace ready.", false, \`\${currentFiles.length} file(s) currently in the registry.\`);
        }, 2400);
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
            const response = await fetch(\`/api/files/\${fileId}\`, { method: "DELETE" });
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
            const response = await fetch(\`/api/shares/\${shareId}/revoke\`, { method: "POST" });
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
        const response = await fetch("/api/files");
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

      async function copyShareLink() {
        if (!shareUrlOutput?.value) return;
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrlOutput.value);
        }
        setStatus("Share link copied.", false, "The generated URL is now in your clipboard.");
      }

      async function uploadFileInChunks(file, initData) {
        const chunkSize = Number(initData.chunkSize) || 5 * 1024 * 1024;
        const totalParts = Number(initData.totalParts) || Math.max(1, Math.ceil(file.size / chunkSize));
        let uploadedBytes = 0;

        setUploadProgress(0, "Preparing multipart upload", \`0 of \${totalParts} parts uploaded.\`);

        for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
          const start = (partNumber - 1) * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);
          const baseProgress = file.size > 0 ? (uploadedBytes / file.size) * 95 : 0;

          setStatus(
            \`Uploading part \${partNumber}/\${totalParts}...\`,
            false,
            \`Transferring \${Math.ceil(chunk.size / 1024 / 1024)} MiB chunk through the Worker upload channel.\`,
          );
          setUploadProgress(
            baseProgress,
            \`Uploading part \${partNumber} of \${totalParts}\`,
            \`\${partNumber - 1} of \${totalParts} parts uploaded.\`,
          );

          const response = await fetch(\`/api/files/\${initData.fileId}/upload-part?partNumber=\${partNumber}\`, {
            method: "POST",
            headers: {
              "content-type": "application/octet-stream",
            },
            body: chunk,
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.error || \`Failed to upload part \${partNumber}.\`);
          }

          uploadedBytes += chunk.size;
          const uploadedParts = partNumber;
          const progress = file.size > 0 ? (uploadedBytes / file.size) * 95 : (uploadedParts / totalParts) * 95;
          setUploadProgress(
            progress,
            \`Uploading part \${uploadedParts} of \${totalParts}\`,
            \`\${uploadedParts} of \${totalParts} parts uploaded.\`,
          );
        }
      }

      if (boot.authenticated) {
        renderFiles(currentFiles);
        setStatus("Workspace ready.", false, \`\${currentFiles.length} file(s) currently in the registry.\`);

        document.getElementById("refreshButton")?.addEventListener("click", refreshFiles);
        document.getElementById("logoutButton")?.addEventListener("click", async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          location.reload();
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
          const response = await fetch(\`/api/files/\${fileId}/shares\`, {
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

          setStatus("Preparing upload...", false, "Creating a signed direct-upload plan.");
          const initResponse = await fetch("/api/files/init-upload", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              size: file.size,
              contentType: file.type || "application/octet-stream"
            })
          });

          const initData = await initResponse.json().catch(() => ({}));
          if (!initResponse.ok) {
            setStatus(initData.error || "Failed to initialize upload.", true);
            return;
          }

          try {
            await uploadFileInChunks(file, initData);
          } catch (error) {
            clearUploadProgress();
            setStatus(String(error?.message || "Failed to upload file chunks."), true);
            return;
          }

          let completeData;
          try {
            setStatus("Finalizing upload...", false, "Completing multipart assembly and writing metadata into D1.");
            setUploadProgress(95, "Upload finished", "All parts are uploaded. Finalizing in R2 and writing the D1 file record.", "finalizing");
            const completeResponse = await fetch("/api/files/complete-upload", {
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
            clearUploadProgress();
            setStatus(String(error?.message || "Failed to save file record."), true);
            return;
          }

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
      } else {
        document.getElementById("loginForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const password = event.currentTarget.password.value;
          setStatus("Signing in...", false, "Verifying the admin password and issuing a signed session.");
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ password })
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            setStatus(data.error || "Login failed.", true);
            return;
          }

          location.reload();
        });
      }
    </script>
  </body>
</html>`;
}
