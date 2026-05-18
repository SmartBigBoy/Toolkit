#!/usr/bin/env bash
set -euo pipefail

# 静态 HTML 项目目录
PROJECT_DIR="/workspace/projects"

# 显式声明关键环境变量
export PORT=5000

# 清理 5000 端口残留进程（幂等性）
fuser -k 5000/tcp 2>/dev/null || true
sleep 1

# 使用 Python 静态服务器提供部署服务
cd "$PROJECT_DIR"
exec python3 -m http.server 5000 --bind 0.0.0.0
