#!/bin/bash
# 模型预下载脚本
# 将 onnxruntime-web WASM 文件下载到本地 assets/bg-removal/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MODEL_DIR="$PROJECT_ROOT/assets/bg-removal"

echo "📁 创建模型目录: $MODEL_DIR"
mkdir -p "$MODEL_DIR"

# 切换到模型目录
cd "$MODEL_DIR"

echo "📥 下载 onnxruntime-web WASM 文件..."

# 下载 WASM 文件
curl -L -o "ort-wasm-simd-threaded.wasm" "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort-wasm-simd-threaded.wasm" 2>/dev/null &
curl -L -o "ort-wasm-simd-threaded.jsep.wasm" "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort-wasm-simd-threaded.jsep.wasm" 2>/dev/null &

# 等待下载完成
wait

echo "✅ 模型文件下载完成！"
echo ""
echo "文件列表:"
ls -lh "$MODEL_DIR"

echo ""
echo "注意: AI 背景移除的主要模型文件 (.onnx) 是在浏览器运行时动态下载的，"
echo "会缓存到浏览器的 IndexedDB 中。"
echo "这些 WASM 文件可以加速 onnxruntime-web 的加载。"
