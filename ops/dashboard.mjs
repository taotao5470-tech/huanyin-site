import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OPS_DIR = path.join(ROOT, "ops");
const REPORTS_DIR = path.join(OPS_DIR, "reports");
const OUTPUT_PATH = path.join(OPS_DIR, "dashboard.html");

function loadReports() {
  if (!fs.existsSync(REPORTS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(REPORTS_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const filePath = path.join(REPORTS_DIR, name);
      const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
      payload.__file = name;
      return payload;
    });
}

function renderDashboard(reports) {
  const latest = reports[reports.length - 1] || null;
  const serialized = JSON.stringify({ reports, latest });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HUANYIN 运营看板</title>
  <style>
    :root {
      --bg: #f4efe7;
      --bg-accent: #d7e6db;
      --panel: rgba(255, 251, 245, 0.88);
      --line: rgba(34, 56, 45, 0.12);
      --text: #17221b;
      --muted: #5f6f63;
      --primary: #1f6a52;
      --primary-soft: #d8efe5;
      --warn: #c85a3d;
      --shadow: 0 24px 80px rgba(30, 42, 35, 0.12);
      --radius: 24px;
      --mono: "IBM Plex Mono", "Consolas", monospace;
      --sans: "Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: var(--sans);
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(215, 230, 219, 0.9), transparent 34%),
        radial-gradient(circle at top right, rgba(250, 222, 194, 0.8), transparent 28%),
        linear-gradient(135deg, var(--bg), #f7f4ef 55%, #eef5ef);
    }

    .shell {
      width: min(1240px, calc(100% - 32px));
      margin: 24px auto 40px;
    }

    .hero {
      display: grid;
      grid-template-columns: 1.3fr 0.9fr;
      gap: 18px;
      margin-bottom: 18px;
    }

    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
    }

    .hero-main {
      padding: 28px;
      position: relative;
      overflow: hidden;
    }

    .hero-main::after {
      content: "";
      position: absolute;
      inset: auto -40px -60px auto;
      width: 220px;
      height: 220px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(31, 106, 82, 0.18), rgba(200, 90, 61, 0.18));
      filter: blur(8px);
    }

    .eyebrow {
      display: inline-flex;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--primary-soft);
      color: var(--primary);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      margin: 16px 0 10px;
      font-size: clamp(34px, 5vw, 56px);
      line-height: 0.98;
      letter-spacing: -0.04em;
    }

    .hero-copy {
      max-width: 52ch;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.7;
      margin-bottom: 24px;
    }

    .meta-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .meta-pill {
      padding: 10px 14px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.62);
      border: 1px solid rgba(23, 34, 27, 0.08);
      font-family: var(--mono);
      font-size: 12px;
    }

    .hero-side {
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background:
        linear-gradient(160deg, rgba(31, 106, 82, 0.98), rgba(21, 48, 39, 0.98));
      color: #eef7f1;
    }

    .hero-side h2 {
      margin: 8px 0 0;
      font-size: 18px;
      letter-spacing: -0.03em;
    }

    .hero-side p {
      margin: 10px 0 0;
      color: rgba(238, 247, 241, 0.78);
      line-height: 1.6;
      font-size: 14px;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: var(--mono);
      font-size: 12px;
      color: rgba(238, 247, 241, 0.84);
    }

    .status::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #75f1a5;
      box-shadow: 0 0 0 6px rgba(117, 241, 165, 0.14);
    }

    .grid-kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 18px;
      margin-bottom: 18px;
    }

    .kpi {
      padding: 20px;
    }

    .kpi-label {
      color: var(--muted);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .kpi-value {
      margin-top: 12px;
      font-size: clamp(28px, 4vw, 42px);
      font-weight: 800;
      letter-spacing: -0.05em;
    }

    .kpi-sub {
      margin-top: 8px;
      color: var(--muted);
      font-size: 13px;
    }

    .content {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 18px;
    }

    .stack {
      display: grid;
      gap: 18px;
    }

    .section {
      padding: 22px;
    }

    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }

    .section-title {
      margin: 0;
      font-size: 18px;
      letter-spacing: -0.03em;
    }

    .section-tag {
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(23, 34, 27, 0.06);
      color: var(--muted);
      font-family: var(--mono);
      font-size: 12px;
    }

    .bars {
      display: grid;
      gap: 14px;
    }

    .bar-row {
      display: grid;
      gap: 8px;
    }

    .bar-meta {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      font-size: 14px;
    }

    .bar-track {
      height: 12px;
      border-radius: 999px;
      background: rgba(23, 34, 27, 0.08);
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #1f6a52, #49aa7d);
    }

    .bar-fill.warn {
      background: linear-gradient(90deg, #c85a3d, #e28d5b);
    }

    .bar-fill.gold {
      background: linear-gradient(90deg, #b9892a, #e0bf5d);
    }

    .intent-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .intent-card {
      padding: 18px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.74);
      border: 1px solid rgba(23, 34, 27, 0.08);
    }

    .intent-card strong {
      display: block;
      margin-bottom: 10px;
      font-size: 16px;
    }

    .intent-card span {
      color: var(--muted);
      font-size: 13px;
    }

    .notes {
      display: grid;
      gap: 12px;
      padding-left: 18px;
      color: var(--muted);
      line-height: 1.6;
    }

    .footer {
      margin-top: 18px;
      padding: 18px 22px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      align-items: center;
      justify-content: space-between;
      color: var(--muted);
      font-size: 13px;
    }

    .empty {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.7;
    }

    @media (max-width: 960px) {
      .hero,
      .content,
      .grid-kpis {
        grid-template-columns: 1fr;
      }

      .intent-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="shell" id="app"></div>
  <script>
    const dashboardData = ${serialized};

    function percent(value, total) {
      if (!total) return "0.0%";
      return ((value / total) * 100).toFixed(1) + "%";
    }

    function renderBars(items, tone) {
      if (!items || !items.length) {
        return '<div class="empty">当前没有足够的归档数据。</div>';
      }
      const max = Math.max(...items.map((item) => item.sessions || 0), 1);
      return '<div class="bars">' + items.map((item) => {
        const width = ((item.sessions || 0) / max) * 100;
        return '<div class="bar-row">' +
          '<div class="bar-meta"><strong>' + item.label + '</strong><span>' + (item.sessions || 0) + ' 会话</span></div>' +
          '<div class="bar-track"><div class="bar-fill ' + (tone || '') + '" style="width:' + width + '%"></div></div>' +
        '</div>';
      }).join('') + '</div>';
    }

    function renderIntent(items) {
      if (!items || !items.length) {
        return '<div class="empty">暂无访问意图数据。</div>';
      }
      return '<div class="intent-grid">' + items.map((item) => {
        return '<div class="intent-card">' +
          '<strong>' + item.name + '</strong>' +
          '<div>' + item.sessions + ' 会话</div>' +
          '<span>占比 ' + percent(item.sessions, items.reduce((sum, current) => sum + (current.sessions || 0), 0)) + '</span>' +
        '</div>';
      }).join('') + '</div>';
    }

    function render() {
      const app = document.getElementById('app');
      const latest = dashboardData.latest;
      if (!latest) {
        app.innerHTML = '<div class="card section"><h1>没有可用日报</h1><p class="empty">请先运行 node ops/site-ops.mjs report --days 1 --write</p></div>';
        return;
      }

      const blocks = [
        ['总会话', latest.summary.totalSessions, '最近一天站点进入量'],
        ['机器人会话', latest.summary.totalBotSessions, '用于识别抓取与异常流量'],
        ['独立访客', latest.summary.totalUsers, '当前 Clarity 返回值'],
        ['每次会话页数', latest.summary.pagesPerSession, '页面深度']
      ];

      app.innerHTML = [
        '<section class="hero">',
          '<div class="card hero-main">',
            '<span class="eyebrow">HUANYIN OPS DASHBOARD</span>',
            '<h1>独立站运营看板</h1>',
            '<p class="hero-copy">围绕 Clarity 日报聚合站点访问、来源、设备和意图推断，便于你每天看清流量质量，并和 Cloudflare 封禁动作配合使用。</p>',
            '<div class="meta-strip">',
              '<div class="meta-pill">域名 ' + latest.siteDomain + '</div>',
              '<div class="meta-pill">报告日期 ' + latest.date + '</div>',
              '<div class="meta-pill">项目 ID ' + latest.clarityProjectId + '</div>',
            '</div>',
          '</div>',
          '<div class="card hero-side">',
            '<div>',
              '<div class="status">Daily Automation Active</div>',
              '<h2>当前已生成 ' + dashboardData.reports.length + ' 份归档</h2>',
              '<p>看板优先读取 ops/reports 下最新 JSON。当天没有新归档时，页面会继续展示最后一份成功快照。</p>',
            '</div>',
            '<p>建议和 Cloudflare 黑名单一起使用：先看来源和设备结构，再决定是否封禁异常 IP。</p>',
          '</div>',
        '</section>',
        '<section class="grid-kpis">' +
          blocks.map((item) => '<div class="card kpi"><div class="kpi-label">' + item[0] + '</div><div class="kpi-value">' + item[1] + '</div><div class="kpi-sub">' + item[2] + '</div></div>').join('') +
        '</section>',
        '<section class="content">',
          '<div class="stack">',
            '<div class="card section"><div class="section-head"><h3 class="section-title">访问目的推断</h3><span class="section-tag">Intent</span></div>' + renderIntent(latest.intent) + '</div>',
            '<div class="card section"><div class="section-head"><h3 class="section-title">来源结构</h3><span class="section-tag">Source</span></div>' + renderBars(latest.topSources, 'gold') + '</div>',
            '<div class="card section"><div class="section-head"><h3 class="section-title">页面入口</h3><span class="section-tag">URL</span></div>' + renderBars(latest.topUrls, '') + '</div>',
          '</div>',
          '<div class="stack">',
            '<div class="card section"><div class="section-head"><h3 class="section-title">渠道与设备</h3><span class="section-tag">Channel / Device</span></div>' + renderBars(latest.topChannels, 'warn') + '<div style="height:18px"></div>' + renderBars(latest.topDevices, '') + '</div>',
            '<div class="card section"><div class="section-head"><h3 class="section-title">国家/地区</h3><span class="section-tag">Geo</span></div>' + renderBars(latest.topCountries, 'gold') + '</div>',
            '<div class="card section"><div class="section-head"><h3 class="section-title">运营备注</h3><span class="section-tag">Notes</span></div><ul class="notes">' + (latest.notes || []).map((note) => '<li>' + note + '</li>').join('') + '</ul></div>',
          '</div>',
        '</section>',
        '<section class="card footer">',
          '<div>数据文件: ' + latest.__file + '</div>',
          '<div>更新时间: ' + latest.generatedAt + '</div>',
          '<div>生成方式: node ops/dashboard.mjs</div>',
        '</section>'
      ].join('');
    }

    render();
  </script>
</body>
</html>`;
}

const reports = loadReports();
const html = renderDashboard(reports);
fs.writeFileSync(OUTPUT_PATH, html, "utf8");
console.log(OUTPUT_PATH);
