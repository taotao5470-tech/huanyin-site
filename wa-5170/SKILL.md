# 独立站管理技能 — HUANYIN (AuraLux)

## 站点信息

| 项目 | 值 |
|------|-----|
| 域名 | **https://huanyinvox.top** |
| 域名注册商 | NameSilo |
| GitHub 仓库 | `https://github.com/taotao5470-tech/huanyin-site` |
| Pages 管理 | `https://github.com/taotao5470-tech/huanyin-site/settings/pages` |
| 本地路径 | `C:\Users\Administrator\Desktop\Codex\2026-05-08\c-users-administrator-desktop-code-5-2\preview-site\` |
| 主文件 | `index.html`（全部代码在一个文件） |

## GitHub 配置

```
用户名: taotao5470-tech
仓库: taotao5470-tech/huanyin-site
分支: master
```
（Token 已存于本地 CLAUDE.md 内存中，不在本文件暴露）

## 修改站点后推送（三步）

```bash
cd "C:\Users\Administrator\Desktop\Codex\2026-05-08\c-users-administrator-desktop-code-5-2\preview-site"

git add .
git commit -m "描述改了什么"
git push
```

推送后等待 1-2 分钟，刷新 `https://huanyinvox.top` 即可看到更新。

## DNS 配置（NameSilo）

| Type | Name | Value |
|------|------|-------|
| CNAME | www | taotao5470-tech.github.io |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

## 技能触发

用户说"修改独立站"、"更新网站"、"推送到网站"、"推送站点"、"网站更新"、"huanyinvox" 时，自动在该目录操作并推送。
