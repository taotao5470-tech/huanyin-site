"""
清理 images/mundial 中没有被 worldcup-products.js 引用的孤儿图片文件
（这些文件是早期构建残留，不影响网站功能但会污染仓库）

使用：在 Windows 命令行运行 `python 清理孤儿图片.py`
（仅需 Python 3 基础环境，无任何额外依赖）
"""
import json, os, glob, sys

base_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(base_dir)

# 解析 JS 找到所有应保留的图片
with open('worldcup-products.js', encoding='utf-8') as f:
    raw = f.read().split('= ', 1)[1].rstrip(';\n')
data = json.loads(raw)

keep = set()
for p in data:
    for img in p.get('images', []):
        keep.add(img.replace('\\', '/'))

# 扫描磁盘
disk = set()
for ext in ['jpg', 'jpeg', 'png', 'webp']:
    for f in glob.glob(f'images/mundial/**/*.{ext}', recursive=True):
        disk.add(f.replace('\\', '/'))

orphans = sorted(disk - keep)
print(f'JSON 引用: {len(keep)} 张')
print(f'磁盘文件: {len(disk)} 张')
print(f'孤儿待删: {len(orphans)} 张')
print()

if not orphans:
    print('✓ 没有孤儿，不需要清理')
    sys.exit(0)

# 计算释放大小
total_size = 0
for o in orphans:
    try: total_size += os.path.getsize(o)
    except: pass
print(f'将释放约 {total_size/1024/1024:.1f} MB')
print()

ans = input('确认删除? (y/N): ')
if ans.lower() != 'y':
    print('已取消')
    sys.exit(0)

deleted = 0
failed = 0
for o in orphans:
    try:
        os.remove(o)
        deleted += 1
    except Exception as e:
        failed += 1
        print(f'  ✗ {o}: {e}')

print()
print(f'✓ 已删除 {deleted} 个')
if failed:
    print(f'✗ 失败 {failed} 个 (可能需要管理员权限)')
