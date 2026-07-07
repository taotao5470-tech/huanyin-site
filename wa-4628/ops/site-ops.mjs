import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const OPS_DIR = path.join(ROOT, "ops");
const REPORTS_DIR = path.join(OPS_DIR, "reports");
const CLARITY_ENDPOINT = "https://www.clarity.ms/export-data/api/v1/project-live-insights";
const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const parsed = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function getConfig() {
  const env = {
    ...parseEnvFile(path.join(ROOT, ".env")),
    ...parseEnvFile(path.join(ROOT, ".env.local")),
    ...process.env,
  };

  const clarityProjectId = env.CLARITY_PROJECT_ID || detectClarityProjectId();
  const domain = env.SITE_DOMAIN || detectDomainFromCname();

  return {
    siteDomain: domain,
    clarityProjectId,
    clarityApiToken: env.CLARITY_API_TOKEN || "",
    cloudflareApiToken: env.CLOUDFLARE_API_TOKEN || "",
    cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID || "",
    cloudflareZoneId: env.CLOUDFLARE_ZONE_ID || "",
  };
}

function detectDomainFromCname() {
  const cnamePath = path.join(ROOT, "CNAME");
  if (!fs.existsSync(cnamePath)) {
    return "";
  }
  return fs.readFileSync(cnamePath, "utf8").trim();
}

function detectClarityProjectId() {
  const indexPath = path.join(ROOT, "index.html");
  if (!fs.existsSync(indexPath)) {
    return "";
  }

  const content = fs.readFileSync(indexPath, "utf8");
  const match = content.match(/clarity"\s*,\s*"script"\s*,\s*"([a-z0-9]+)"/i);
  return match ? match[1] : "";
}

function requireValue(name, value) {
  if (!value) {
    throw new Error(`Missing required config: ${name}`);
  }
  return value;
}

function toNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function readArgs(argv) {
  const [command = "help", ...rest] = argv;
  const options = {};

  for (let i = 0; i < rest.length; i += 1) {
    const current = rest[i];
    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    i += 1;
  }

  return { command, options };
}

async function httpJson(url, init = {}) {
  const response = await fetch(url, init);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function clarityFetch(dimensions = [], numOfDays = 1) {
  const config = getConfig();
  requireValue("CLARITY_API_TOKEN", config.clarityApiToken);

  const params = new URLSearchParams();
  params.set("numOfDays", String(numOfDays));
  dimensions.forEach((dimension, index) => {
    params.set(`dimension${index + 1}`, dimension);
  });

  return httpJson(`${CLARITY_ENDPOINT}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${config.clarityApiToken}`,
      "Content-Type": "application/json",
    },
  });
}

function getMetric(payload, metricName) {
  return payload.find((item) => item.metricName === metricName) || null;
}

function normalizeRows(metric) {
  return Array.isArray(metric?.information) ? metric.information : [];
}

const METRIC_KEYS = new Set([
  "totalSessionCount",
  "totalBotSessionCount",
  "distantUserCount",
  "PagesPerSessionPercentage",
]);

function resolveRowLabel(row, preferredKey, fallbackLabel = "Unknown") {
  if (row && preferredKey && row[preferredKey] != null && row[preferredKey] !== "") {
    return String(row[preferredKey]);
  }

  const fallbackEntry = Object.entries(row || {}).find(([key, value]) => {
    return !METRIC_KEYS.has(key) && value != null && String(value).trim() !== "";
  });

  return fallbackEntry ? String(fallbackEntry[1]) : fallbackLabel;
}

function pickTop(rows, dimensionKey, count = 5, fallbackLabel = "Unknown") {
  return rows
    .map((row) => ({
      label: resolveRowLabel(row, dimensionKey, fallbackLabel),
      sessions: toNumber(row.totalSessionCount),
      users: toNumber(row.distantUserCount),
      bots: toNumber(row.totalBotSessionCount),
      pagesPerSession: toNumber(row.PagesPerSessionPercentage),
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, count);
}

function aggregateDimension(rows, dimensionKey, fallbackLabel) {
  const bucket = new Map();

  for (const row of rows) {
    const label = resolveRowLabel(row, dimensionKey, fallbackLabel);
    const existing = bucket.get(label) || {
      label,
      sessions: 0,
      users: 0,
      bots: 0,
      pagesPerSessionWeighted: 0,
    };

    const sessions = toNumber(row.totalSessionCount);
    const users = toNumber(row.distantUserCount);
    const bots = toNumber(row.totalBotSessionCount);
    const pagesPerSession = toNumber(row.PagesPerSessionPercentage);

    existing.sessions += sessions;
    existing.users += users;
    existing.bots += bots;
    existing.pagesPerSessionWeighted += pagesPerSession * sessions;
    bucket.set(label, existing);
  }

  return [...bucket.values()]
    .map((item) => ({
      label: item.label,
      sessions: item.sessions,
      users: item.users,
      bots: item.bots,
      pagesPerSession: item.sessions ? item.pagesPerSessionWeighted / item.sessions : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function inferPurpose(urlRows, sourceRows, channelRows) {
  const buckets = new Map([
    ["产品浏览/选品", 0],
    ["营销活动流量", 0],
    ["品牌直达/回访", 0],
    ["售后或订单支持", 0],
    ["其他意图", 0],
  ]);

  for (const row of urlRows) {
    const url = String(row.label || "").toLowerCase();
    const sessions = toNumber(row.sessions);
    if (url.includes("worldcup") || url.includes("product") || url.includes("jersey")) {
      buckets.set("产品浏览/选品", buckets.get("产品浏览/选品") + sessions);
    } else if (url.includes("after") || url.includes("support") || url.includes("tracking")) {
      buckets.set("售后或订单支持", buckets.get("售后或订单支持") + sessions);
    } else if (url === "/" || url.endsWith(".top") || url.endsWith(".top/")) {
      buckets.set("品牌直达/回访", buckets.get("品牌直达/回访") + sessions);
    } else {
      buckets.set("其他意图", buckets.get("其他意图") + sessions);
    }
  }

  for (const row of sourceRows) {
    const source = String(row.label || "").toLowerCase();
    const sessions = toNumber(row.sessions);
    if (
      source.includes("facebook") ||
      source === "fb" ||
      source.includes("instagram") ||
      source.includes("tiktok") ||
      source.includes("google") ||
      source.includes("whatsapp")
    ) {
      buckets.set("营销活动流量", buckets.get("营销活动流量") + sessions);
    }
  }

  for (const row of channelRows) {
    const channel = String(row.label || "").toLowerCase();
    const sessions = toNumber(row.sessions);
    if (
      channel.includes("paid") ||
      channel.includes("social") ||
      channel.includes("display") ||
      channel.includes("email")
    ) {
      buckets.set("营销活动流量", buckets.get("营销活动流量") + sessions);
    }
    if (channel.includes("direct") || channel.includes("organic")) {
      buckets.set("品牌直达/回访", buckets.get("品牌直达/回访") + sessions);
    }
  }

  const total = [...buckets.values()].reduce((sum, value) => sum + value, 0) || 1;
  return [...buckets.entries()]
    .map(([name, sessions]) => ({
      name,
      sessions,
      share: sessions / total,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .filter((item) => item.sessions > 0);
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push(`# 独立站日报 ${report.date}`);
  lines.push("");
  lines.push(`- 域名: ${report.siteDomain}`);
  lines.push(`- Clarity 项目: ${report.clarityProjectId}`);
  lines.push(`- 数据范围: 最近 ${report.numOfDays} 天（Clarity API 返回 UTC 数据）`);
  lines.push("");
  lines.push("## 核心概览");
  lines.push("");
  lines.push(`- 总会话: ${report.summary.totalSessions}`);
  lines.push(`- 机器人会话: ${report.summary.totalBotSessions}`);
  lines.push(`- 独立访客: ${report.summary.totalUsers}`);
  lines.push(`- 每次会话页数: ${report.summary.pagesPerSession}`);
  lines.push("");
  lines.push("## 访问目的（推断）");
  lines.push("");
  for (const item of report.intent) {
    lines.push(`- ${item.name}: ${item.sessions} 会话，约 ${formatPercent(item.share)}`);
  }
  lines.push("");
  lines.push("## Top URL");
  lines.push("");
  for (const item of report.topUrls) {
    lines.push(`- ${item.label}: ${item.sessions} 会话`);
  }
  lines.push("");
  lines.push("## Top 来源");
  lines.push("");
  for (const item of report.topSources) {
    lines.push(`- ${item.label}: ${item.sessions} 会话`);
  }
  lines.push("");
  lines.push("## Top 渠道");
  lines.push("");
  for (const item of report.topChannels) {
    lines.push(`- ${item.label}: ${item.sessions} 会话`);
  }
  lines.push("");
  lines.push("## 设备");
  lines.push("");
  for (const item of report.topDevices) {
    lines.push(`- ${item.label}: ${item.sessions} 会话`);
  }
  lines.push("");
  lines.push("## 国家/地区");
  lines.push("");
  for (const item of report.topCountries) {
    lines.push(`- ${item.label}: ${item.sessions} 会话`);
  }
  lines.push("");
  lines.push("## 说明");
  lines.push("");
  lines.push("- 访问目的为基于 URL、来源和渠道的启发式推断，不是 Clarity 原生字段。");
  lines.push("- Clarity Data Export API 每个项目每天最多 10 次请求，当前日报默认使用 3 次。");
  return `${lines.join("\n")}\n`;
}

async function buildClarityReport(options = {}) {
  const numOfDays = Number(options.days || 1);
  const config = getConfig();
  requireValue("CLARITY_PROJECT_ID", config.clarityProjectId);

  const [summaryPayload, trafficPayload, contextPayload] =
    await Promise.all([
      clarityFetch([], numOfDays),
      clarityFetch(["URL", "Source", "Channel"], numOfDays),
      clarityFetch(["Device", "Country/Region"], numOfDays),
    ]);

  const traffic = normalizeRows(getMetric(summaryPayload, "Traffic"))[0] || {};
  const trafficRows = normalizeRows(getMetric(trafficPayload, "Traffic"));
  const contextRows = normalizeRows(getMetric(contextPayload, "Traffic"));
  const urlRows = aggregateDimension(trafficRows, "URL", "未识别页面");
  const sourceRows = aggregateDimension(trafficRows, "Source", "未识别来源");
  const channelRows = aggregateDimension(trafficRows, "Channel", "未识别渠道");
  const deviceRows = aggregateDimension(contextRows, "Device", "未识别设备");
  const countryRows = aggregateDimension(contextRows, "Country/Region", "未识别地区");

  const report = {
    date: options.date || formatDate(),
    generatedAt: new Date().toISOString(),
    siteDomain: config.siteDomain,
    clarityProjectId: config.clarityProjectId,
    numOfDays,
    summary: {
      totalSessions: toNumber(traffic.totalSessionCount),
      totalBotSessions: toNumber(traffic.totalBotSessionCount),
      totalUsers: toNumber(traffic.distantUserCount),
      pagesPerSession: toNumber(traffic.PagesPerSessionPercentage),
    },
    topUrls: pickTop(urlRows, "label", 5, "未识别页面"),
    topSources: pickTop(sourceRows, "label", 5, "未识别来源"),
    topChannels: pickTop(channelRows, "label", 5, "未识别渠道"),
    topDevices: pickTop(deviceRows, "label", 5, "未识别设备"),
    topCountries: pickTop(countryRows, "label", 5, "未识别地区"),
    intent: inferPurpose(urlRows, sourceRows, channelRows),
    raw: {
      summaryPayload,
      trafficPayload,
      contextPayload,
    },
  };

  return report;
}

async function getZoneId() {
  const config = getConfig();
  if (config.cloudflareZoneId) {
    return config.cloudflareZoneId;
  }

  requireValue("SITE_DOMAIN", config.siteDomain);
  requireValue("CLOUDFLARE_API_TOKEN", config.cloudflareApiToken);

  const payload = await httpJson(
    `${CLOUDFLARE_API_BASE}/zones?name=${encodeURIComponent(config.siteDomain)}`,
    {
      headers: {
        Authorization: `Bearer ${config.cloudflareApiToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!payload.success || !Array.isArray(payload.result) || payload.result.length === 0) {
    throw new Error(`Unable to resolve Cloudflare zone for ${config.siteDomain}`);
  }

  return payload.result[0].id;
}

async function cloudflareRequest(endpoint, init = {}) {
  const config = getConfig();
  requireValue("CLOUDFLARE_API_TOKEN", config.cloudflareApiToken);

  const payload = await httpJson(`${CLOUDFLARE_API_BASE}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.cloudflareApiToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!payload.success) {
    throw new Error(`Cloudflare API failed: ${JSON.stringify(payload.errors || payload)}`);
  }

  return payload.result;
}

async function listBlockedIps() {
  const config = getConfig();
  const scope = config.cloudflareAccountId
    ? `/accounts/${config.cloudflareAccountId}`
    : `/zones/${await getZoneId()}`;
  const result = await cloudflareRequest(
    `${scope}/firewall/access_rules/rules?mode=block&per_page=100`,
  );

  return Array.isArray(result)
    ? result.map((item) => ({
        id: item.id,
        mode: item.mode,
        notes: item.notes || "",
        target: item.configuration?.target || "",
        value: item.configuration?.value || "",
        createdOn: item.created_on || "",
      }))
    : [];
}

function looksLikeRuleId(value) {
  return /^[a-f0-9]{32}$/i.test(value);
}

async function blockIp(ip, note) {
  const config = getConfig();
  const scope = config.cloudflareAccountId
    ? `/accounts/${config.cloudflareAccountId}`
    : `/zones/${await getZoneId()}`;
  const existing = (await listBlockedIps()).find((item) => item.value === ip);
  if (existing) {
    return { alreadyExists: true, rule: existing };
  }

  const result = await cloudflareRequest(`${scope}/firewall/access_rules/rules`, {
    method: "POST",
    body: JSON.stringify({
      mode: "block",
      notes: note || `Blocked by site ops on ${new Date().toISOString()}`,
      configuration: {
        target: "ip",
        value: ip,
      },
    }),
  });

  return {
    alreadyExists: false,
    rule: {
      id: result.id,
      mode: result.mode,
      notes: result.notes || "",
      target: result.configuration?.target || "",
      value: result.configuration?.value || "",
      createdOn: result.created_on || "",
    },
  };
}

async function unblockIp(value) {
  const config = getConfig();
  const scope = config.cloudflareAccountId
    ? `/accounts/${config.cloudflareAccountId}`
    : `/zones/${await getZoneId()}`;
  let ruleId = value;

  if (!looksLikeRuleId(value)) {
    const rules = await listBlockedIps();
    const matched = rules.find((item) => item.value === value);
    if (!matched) {
      throw new Error(`No blocked IP rule found for ${value}`);
    }
    ruleId = matched.id;
  }

  await cloudflareRequest(`${scope}/firewall/access_rules/rules/${ruleId}`, {
    method: "DELETE",
  });

  return { ruleId };
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function printHelp() {
  console.log(`Usage:
  node ops/site-ops.mjs report [--days 1] [--write]
  node ops/site-ops.mjs block-ip --ip 1.2.3.4 [--note "bad bot"]
  node ops/site-ops.mjs unblock-ip --ip 1.2.3.4
  node ops/site-ops.mjs unblock-ip --rule <rule_id>
  node ops/site-ops.mjs list-blocks
  node ops/site-ops.mjs config-check`);
}

async function writeReport(report) {
  ensureDir(REPORTS_DIR);
  const baseName = `clarity-report-${report.date}`;
  const markdownPath = path.join(REPORTS_DIR, `${baseName}.md`);
  const jsonPath = path.join(REPORTS_DIR, `${baseName}.json`);
  fs.writeFileSync(markdownPath, buildMarkdownReport(report), "utf8");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  return { markdownPath, jsonPath };
}

async function main() {
  const { command, options } = readArgs(process.argv.slice(2));

  if (command === "help") {
    printHelp();
    return;
  }

  if (command === "config-check") {
    const config = getConfig();
    printJson({
      siteDomain: config.siteDomain,
      clarityProjectId: config.clarityProjectId,
      hasClarityToken: Boolean(config.clarityApiToken),
      hasCloudflareToken: Boolean(config.cloudflareApiToken),
      cloudflareAccountId: config.cloudflareAccountId || null,
      cloudflareZoneId: config.cloudflareZoneId || null,
    });
    return;
  }

  if (command === "report") {
    const report = await buildClarityReport(options);
    const markdown = buildMarkdownReport(report);
    process.stdout.write(markdown);

    if (options.write) {
      const written = await writeReport(report);
      console.error(`Saved report: ${written.markdownPath}`);
      console.error(`Saved raw data: ${written.jsonPath}`);
    }
    return;
  }

  if (command === "list-blocks") {
    printJson(await listBlockedIps());
    return;
  }

  if (command === "block-ip") {
    const ip = requireValue("ip", options.ip);
    printJson(await blockIp(ip, options.note));
    return;
  }

  if (command === "unblock-ip") {
    const target = options.rule || options.ip;
    printJson(await unblockIp(requireValue("rule or ip", target)));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
