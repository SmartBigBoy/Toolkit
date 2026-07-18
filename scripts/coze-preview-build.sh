#!/usr/bin/env bash
set -euo pipefail

# 静态 HTML 项目，无需构建准备
# 仅验证项目文件存在
PROJECT_DIR="/workspace/projects"

if [ ! -f "$PROJECT_DIR/index.html" ]; then
    echo "Error: index.html not found in $PROJECT_DIR"
    exit 1
fi

echo "Static HTML project ready for preview"
