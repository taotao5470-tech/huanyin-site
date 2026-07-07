@echo off
chcp 65001 >nul
echo ============================================================
echo   MUNDIAL 2026 - 一键提交并推送到 GitHub
echo ============================================================
echo.
cd /d "%~dp0"

echo [1/6] 清理可能残留的 git lock 文件...
if exist ".git\index.lock" del /f ".git\index.lock"

echo.
echo [2/6] 清理 images/mundial 的孤儿图片 (节省仓库空间)...
echo (Python 清理脚本会列出待删并询问确认)
python "清理孤儿图片.py"
if errorlevel 1 echo (清理被跳过或失败，继续...)

echo.
echo [3/6] 当前分支:
git branch --show-current

echo.
echo [4/6] 暂存所有 World Cup 改动...
git add index.html
git add worldcup.html
git add worldcup-products.js
git add worldcup-preview.html
git add index.html.pre-worldcup-backup
git add MUNDIAL_2026_验收清单.md
git add 无图SPU清单.txt 2>nul
git add 清理孤儿图片.py
git add "一键提交并推送.bat"
git add images/mundial

echo.
echo [5/6] 准备提交 (查看变化):
git status --short

echo.
set /p CONFIRM="是否继续提交并推送? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo 已取消。已暂存的改动会保留，可以稍后再推。
    pause
    exit /b 0
)

echo.
echo 正在提交...
git commit -m "feat(worldcup): Add 2026 World Cup activity catalog + 3 homepage anchors" -m "- 4th category card 'Mundial 2026' alongside AirPods cards" -m "- Top promo bar (May 12-31 / +200pcs / -15%%)" -m "- First-screen hero banner with countdown to 2026-06-11" -m "- Right-bottom floater (persistent, dismissible)" -m "- New worldcup.html (Level 2 catalog + Level 3 product detail via hash routing)" -m "- 269 SPUs (119 national teams + 21 clubs + 37 vintage + 92 merch)" -m "- 500 product images extracted from 16 xlsx files, deduplicated by hash, aggregated per SPU" -m "- Suggested USD pricing for all categories" -m "- Original index.html preserved as index.html.pre-worldcup-backup"

echo.
echo [6/6] 推送到 GitHub (worldcup-event-2026 分支)...
git push -u origin worldcup-event-2026

echo.
echo ============================================================
echo   完成! 在 GitHub 上 review:
echo   https://github.com/taotao5470-tech/huanyin-site/compare/master...worldcup-event-2026
echo ============================================================
pause
