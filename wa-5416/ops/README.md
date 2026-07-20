# 独立站统计与安全运维

这个目录提供两类能力：

1. `Microsoft Clarity` 日报抓取与本地归档
2. `Cloudflare` IP 拉黑、查看、解封

## 前提

- 当前域名 `huanyinvox.top` 已接在 Cloudflare 前面。
- 站点已接入 Clarity 脚本，当前仓库内自动识别到项目 ID：`wp2t0783m5`
- 需要你自己补两个 token：
  - `CLARITY_API_TOKEN`
  - `CLOUDFLARE_API_TOKEN`

## 配置

在仓库根目录创建 `.env.local`，可直接参考 [\.env.example](C:\Users\Administrator\Desktop\独立站备份\世界杯策划版\.env.example)。

最少配置：

```env
SITE_DOMAIN=huanyinvox.top
CLARITY_PROJECT_ID=wp2t0783m5
CLARITY_API_TOKEN=替换成你的Clarity导出Token
CLOUDFLARE_API_TOKEN=替换成你的Cloudflare Token
```

可选：

```env
CLOUDFLARE_ZONE_ID=如果你已知 zone id，可以直接填
```

## Cloudflare Token 权限

建议至少包含：

- `Zone Zone Read`
- `Zone Firewall Services Write`

如果你的账户策略区分得更细，至少要满足“查 zone + 写 IP Access Rule”。

## Clarity Token 获取

Clarity 项目后台：

`Settings -> Data Export -> Generate new API token`

注意：

- Clarity 导出 API 只能拉最近 `1-3` 天数据
- 每个项目每天最多 `10` 次请求
- 当前日报默认消耗 `3` 次请求

## 用法

生成日报并写入本地归档：

```powershell
node ops/site-ops.mjs report --days 1 --write
```

生成运营看板 HTML：

```powershell
node ops/dashboard.mjs
```

只查看配置识别结果：

```powershell
node ops/site-ops.mjs config-check
```

查看已拉黑 IP：

```powershell
node ops/site-ops.mjs list-blocks
```

拉黑 IP：

```powershell
node ops/site-ops.mjs block-ip --ip 1.2.3.4 --note "bad bot / fake lead"
```

按 IP 解封：

```powershell
node ops/site-ops.mjs unblock-ip --ip 1.2.3.4
```

按规则 ID 解封：

```powershell
node ops/site-ops.mjs unblock-ip --rule 1234567890abcdef1234567890abcdef
```

## 日报内容

日报包含：

- 总会话、机器人会话、独立访客、每次会话页数
- Top URL
- Top 来源 Source
- Top 渠道 Channel
- 设备分布
- 国家/地区分布
- 访问目的推断

其中“访问目的”不是 Clarity 原生字段，而是基于以下信号做的启发式判断：

- URL
- Source
- Channel

因此它适合运营判断，不适合当成审计口径。

## 本次优化

- 日报请求数已从 `6` 次压缩到 `3` 次
- 看板中的 `Unknown` 已替换为更清晰的中文占位，例如：
  - `未识别来源`
  - `未识别页面`
  - `未识别地区`
