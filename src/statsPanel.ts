import * as vscode from 'vscode';

/** Serializable payload for the stats webview (postMessage / refresh). */
export type StatsPanelData =
    | { status: 'no-auth'; detail?: string }
    | { status: 'error'; message: string }
    | {
          status: 'ok';
          variant: 'summary';
          planName: string | null;
          planExpiry: string | null;
          totalPercent: number | null;
          autoPercent: number | null;
          apiPercent: number | null;
          includedUsed: number | null;
          includedLimit: number | null;
          progressRatio: number;
      }
    | {
          status: 'ok';
          variant: 'legacy';
          planName: string | null;
          planExpiry: string | null;
          premiumUsed: number;
          premiumLimit: number | null;
          autoUsed: number;
          autoLimit: number | null;
          progressRatio: number;
      };

const VIEW_TYPE = 'cursorLimits.stats';

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function statsWebviewHtml(nonce: string): string {
    const csp = [
        "default-src 'none'",
        "style-src 'unsafe-inline'",
        `script-src 'nonce-${nonce}'`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cursor usage</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-foreground);
      --muted: var(--vscode-descriptionForeground);
      --border: var(--vscode-widget-border, var(--vscode-panel-border));
      --card: var(--vscode-sideBar-background, var(--vscode-editor-background));
      --link: var(--vscode-textLink-foreground);
      --err: var(--vscode-errorForeground);
      --warn: var(--vscode-editorWarning-foreground);
    }
    body {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      color: var(--fg);
      background: var(--bg);
      margin: 0;
      padding: 16px 20px 24px;
      line-height: 1.45;
    }
    h1 {
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }
    .sub {
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 16px;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      border-radius: 2px;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button:disabled { opacity: 0.5; cursor: default; }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 12px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      margin: 6px 0;
    }
    .label { color: var(--muted); }
    .bar-wrap {
      height: 8px;
      background: var(--vscode-progressBar-background, rgba(128,128,128,0.25));
      border-radius: 4px;
      overflow: hidden;
      margin-top: 12px;
    }
    .bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.2s ease;
    }
    .bar-fill.low { background: var(--vscode-charts-green, #3fb950); }
    .bar-fill.mid { background: var(--vscode-charts-yellow, #d29922); }
    .bar-fill.high { background: var(--vscode-charts-red, #f85149); }
    .msg { color: var(--muted); }
    .msg.err { color: var(--err); }
    a { color: var(--link); text-decoration: none; font-size: 12px; }
    a:hover { text-decoration: underline; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--border); }

    /* Skeleton loader */
    @keyframes sk-shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }
    .sk {
      border-radius: 4px;
      background: linear-gradient(
        90deg,
        var(--vscode-input-background, rgba(120, 120, 120, 0.14)) 0%,
        var(--vscode-toolbar-hoverBackground, rgba(160, 160, 160, 0.22)) 45%,
        var(--vscode-input-background, rgba(120, 120, 120, 0.14)) 90%
      );
      background-size: 220% 100%;
      animation: sk-shimmer 1.15s ease-in-out infinite;
    }
    .sk-card {
      pointer-events: none;
    }
    .sk-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin: 10px 0;
    }
    .sk-line {
      height: 11px;
      display: block;
    }
    .sk-line--label { width: 32%; max-width: 120px; min-width: 72px; }
    .sk-line--value { width: 22%; max-width: 72px; min-width: 48px; flex-shrink: 0; }
    .sk-bar {
      height: 8px;
      width: 100%;
      margin-top: 14px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>Cursor usage</h1>
  <p class="sub">Synced from your Cursor session (same data as the status bar).</p>
  <div class="toolbar">
    <button type="button" id="refresh">Refresh</button>
    <span class="msg" id="status"></span>
  </div>
  <div id="root"></div>
  <div class="footer">
    <a href="#" id="openSpending">Open spending on cursor.com</a>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const root = document.getElementById('root');
    const refreshBtn = document.getElementById('refresh');
    const statusEl = document.getElementById('status');
    const openSpending = document.getElementById('openSpending');

    function pct(n) {
      if (n === null || n === undefined || typeof n !== 'number' || !isFinite(n)) return 'N/A';
      return Math.round(n) + '%';
    }

    function barClass(ratio) {
      if (ratio >= 0.95) return 'high';
      if (ratio >= 0.80) return 'mid';
      return 'low';
    }

    function esc(s) {
      if (s == null) return '';
      const d = document.createElement('div');
      d.textContent = String(s);
      return d.innerHTML;
    }

    function skeletonMarkup() {
      return (
        '<div class="card sk-card" aria-hidden="true">' +
        '<div class="sk-row"><span class="sk sk-line sk-line--label"></span><span class="sk sk-line sk-line--value"></span></div>' +
        '<div class="sk-row"><span class="sk sk-line sk-line--label"></span><span class="sk sk-line sk-line--value"></span></div>' +
        '<div class="sk sk-bar"></div>' +
        '<div class="sk-row"><span class="sk sk-line sk-line--label"></span><span class="sk sk-line sk-line--value"></span></div>' +
        '<div class="sk-row"><span class="sk sk-line sk-line--label"></span><span class="sk sk-line sk-line--value"></span></div>' +
        '<div class="sk-row"><span class="sk sk-line sk-line--label"></span><span class="sk sk-line sk-line--value"></span></div>' +
        '</div>'
      );
    }

    function showSkeleton() {
      root.setAttribute('aria-busy', 'true');
      root.innerHTML = skeletonMarkup();
    }

    function render(data) {
      root.removeAttribute('aria-busy');
      root.innerHTML = '';
      statusEl.textContent = '';

      if (data.status === 'no-auth') {
        const p = document.createElement('p');
        p.className = 'msg err';
        p.textContent = data.detail || 'Could not read Cursor auth. Sign in to Cursor.';
        root.appendChild(p);
        return;
      }
      if (data.status === 'error') {
        const p = document.createElement('p');
        p.className = 'msg err';
        p.textContent = data.message;
        root.appendChild(p);
        return;
      }

      const card = document.createElement('div');
      card.className = 'card';

      const planRow = document.createElement('div');
      planRow.className = 'row';
      planRow.innerHTML = '<span class="label">Plan</span><span>' + esc(data.planName || 'N/A') + '</span>';
      card.appendChild(planRow);

      const expRow = document.createElement('div');
      expRow.className = 'row';
      expRow.innerHTML = '<span class="label">Renews / expiry</span><span>' + esc(data.planExpiry || 'N/A') + '</span>';
      card.appendChild(expRow);

      const barWrap = document.createElement('div');
      barWrap.className = 'bar-wrap';
      const fill = document.createElement('div');
      fill.className = 'bar-fill ' + barClass(data.progressRatio);
      fill.style.width = Math.min(100, Math.max(0, data.progressRatio * 100)) + '%';
      barWrap.appendChild(fill);
      card.appendChild(barWrap);

      if (data.variant === 'summary') {
        [['Included (total)', pct(data.totalPercent)], ['Auto + Composer', pct(data.autoPercent)], ['API', pct(data.apiPercent)]].forEach(function (pair) {
          const r = document.createElement('div');
          r.className = 'row';
          r.innerHTML = '<span class="label">' + esc(pair[0]) + '</span><span>' + esc(pair[1]) + '</span>';
          card.appendChild(r);
        });
        if (data.includedUsed != null && data.includedLimit != null) {
          const r = document.createElement('div');
          r.className = 'row';
          r.innerHTML = '<span class="label">Included units</span><span>' + esc(String(data.includedUsed)) + ' / ' + esc(String(data.includedLimit)) + '</span>';
          card.appendChild(r);
        }
      } else {
        const pr = document.createElement('div');
        pr.className = 'row';
        pr.innerHTML = '<span class="label">Premium requests</span><span>' + esc(String(data.premiumUsed)) + ' / ' + esc(data.premiumLimit != null ? String(data.premiumLimit) : 'N/A') + '</span>';
        card.appendChild(pr);
        const ar = document.createElement('div');
        ar.className = 'row';
        ar.innerHTML = '<span class="label">Auto / Composer</span><span>' + esc(String(data.autoUsed)) + ' / ' + esc(data.autoLimit != null ? String(data.autoLimit) : 'N/A') + '</span>';
        card.appendChild(ar);
      }

      root.appendChild(card);
    }

    window.addEventListener('message', function (e) {
      const m = e.data;
      if (m && m.type === 'update') {
        refreshBtn.disabled = false;
        render(m.payload);
      }
      if (m && m.type === 'loading') {
        refreshBtn.disabled = true;
        statusEl.textContent = '';
        showSkeleton();
      }
    });

    refreshBtn.addEventListener('click', function () {
      vscode.postMessage({ type: 'refresh' });
    });

    openSpending.addEventListener('click', function (ev) {
      ev.preventDefault();
      vscode.postMessage({ type: 'openSpending' });
    });

    showSkeleton();
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

let panelSingleton: vscode.WebviewPanel | undefined;

export function openCursorStatsPanel(
    context: vscode.ExtensionContext,
    fetchData: () => Promise<StatsPanelData>,
): void {
    if (panelSingleton) {
        panelSingleton.reveal(vscode.ViewColumn.Active);
        void pushUpdate(panelSingleton, fetchData);
        return;
    }

    panelSingleton = vscode.window.createWebviewPanel(
        VIEW_TYPE,
        'Cursor usage',
        vscode.ViewColumn.Active,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        },
    );

    const nonce = getNonce();
    panelSingleton.webview.html = statsWebviewHtml(nonce);

    panelSingleton.onDidDispose(() => {
        panelSingleton = undefined;
    });

    panelSingleton.webview.onDidReceiveMessage(
        (msg: { type?: string }) => {
            if (msg?.type === 'ready') {
                void pushUpdate(panelSingleton!, fetchData);
                return;
            }
            if (msg?.type === 'refresh') {
                void pushUpdate(panelSingleton!, fetchData, true);
                return;
            }
            if (msg?.type === 'openSpending') {
                vscode.env.openExternal(vscode.Uri.parse('https://cursor.com/dashboard/spending'));
            }
        },
        undefined,
        context.subscriptions,
    );
}

async function pushUpdate(
    panel: vscode.WebviewPanel,
    fetchData: () => Promise<StatsPanelData>,
    showLoading = false,
): Promise<void> {
    if (showLoading) {
        await panel.webview.postMessage({ type: 'loading' });
    }
    const payload = await fetchData();
    await panel.webview.postMessage({ type: 'update', payload });
}
