#!/bin/bash
# ============================================================
# 护眼精灵 - PythonAnywhere 一键更新脚本
# 在 Bash Console 中运行以下命令即可：
#   bash <(curl -fsSL https://raw.githubusercontent.com/LXX218360/eye-guard-web/main/update.sh)
# ============================================================

set -e

echo ""
echo "========================================"
echo "  护眼精灵 PythonAnywhere 更新脚本"
echo "========================================"
echo ""

# 配置
REPO_RAW="https://raw.githubusercontent.com/LXX218360/eye-guard-web/main"
TARGET_DIR="${TARGET_DIR:-$HOME/eye-guard-web}"

# 确保目录存在
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

echo "[1/5] 目标目录: $TARGET_DIR"
echo ""

echo "[2/5] 下载最新 api_server.py..."
if curl -fsSL -o api_server.py "$REPO_RAW/api_server.py"; then
    SIZE=$(wc -c < api_server.py | tr -d ' ')
    echo "      成功: api_server.py ($SIZE bytes)"
else
    echo "      失败: 无法下载 api_server.py"
    exit 1
fi

echo ""
echo "[3/5] 下载最新 app.js..."
if curl -fsSL -o app.js "$REPO_RAW/app.js"; then
    SIZE=$(wc -c < app.js | tr -d ' ')
    echo "      成功: app.js ($SIZE bytes)"
else
    echo "      警告: app.js 下载失败"
fi

echo ""
echo "[4/5] 下载其他前端文件..."
for fname in index.html style.css hmac-security.js; do
    if curl -fsSL -o "$fname" "$REPO_RAW/$fname" 2>/dev/null; then
        SIZE=$(wc -c < "$fname" | tr -d ' ')
        echo "      成功: $fname ($SIZE bytes)"
    else
        echo "      跳过: $fname (可能不存在或网络问题)"
    fi
done

echo ""
echo "[5/5] 清理旧的新版本标记..."
rm -f api_server.py.new

echo ""
echo "========================================"
echo "  更新完成！"
echo "========================================"
echo ""
echo "请在 PythonAnywhere Web 标签页点击"
echo "[Reload] 按钮重启应用，新代码即可生效。"
echo ""
echo "应用地址: https://18073951649.pythonanywhere.com"
echo "管理后台: https://18073951649.pythonanywhere.com/admin/update?pwd=你的密码"
echo ""
