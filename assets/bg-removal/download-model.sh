#!/bin/bash
# 模型下载脚本 - 在本地运行
# 使用方法: bash download-model.sh

BASE_URL="https://staticimgly.com/@imgly/background-removal-data/1.4.5/dist"

echo "=========================================="
echo "证件照换底 AI 模型下载脚本"
echo "=========================================="
echo ""
echo "需要下载的文件："
echo "1. ort-wasm-simd-threaded.wasm (~10MB)"
echo "2. models/medium (~85MB)"
echo ""
echo "开始下载..."
echo ""

# 1. 下载 ONNX Runtime WASM
echo "[1/2] 下载 ONNX Runtime WASM..."
mkdir -p onnxruntime-web
curl -L "${BASE_URL}/11164364a2f20d763126d6824eb0783434f5224a8131cf9b3d9f2fe2b982ba1f" -o "onnxruntime-web/chunk_0" && echo "  chunk 1/3 完成"
curl -L "${BASE_URL}/a585791774617cbed5fe36ba92991dcfb893a3d46326cc09d442dd57448e0d18" -o "onnxruntime-web/chunk_1" && echo "  chunk 2/3 完成"
curl -L "${BASE_URL}/659999798b628f9f9af7784602d501ffd37299bf84cc35e0cd4f04d831985df8" -o "onnxruntime-web/chunk_2" && echo "  chunk 3/3 完成"
cat onnxruntime-web/chunk_* > onnxruntime-web/ort-wasm-simd-threaded.wasm
rm -f onnxruntime-web/chunk_*
echo "  ONNX Runtime WASM 完成 ($(du -h onnxruntime-web/ort-wasm-simd-threaded.wasm | cut -f1))"
echo ""

# 2. 下载 Medium 模型
echo "[2/2] 下载 AI 模型 (medium)..."
mkdir -p models
MODEL_CHUNKS=(
  "4c44c8b64af9f044623ceace7cc55e0bc348394f7ff63629d46118c0a03c9c54"
  "8b2e3d773d7084c5cfac1c04d69d3586e4b8914a840d2b582dfde4940d698957"
  "024e3d8beaf517d25496b73e36b0e0498110652753273e0dd8b591ad7c1c9e2f"
  "1b8eaad4cd019b76e7eba964a38711a0bdeafbd10b6208c1107403a64dbd902a"
  "0c8c5c24237304482ccc70a50008b73c8ef53e4656068da32b635607cca0c8c9"
  "a5b8c519c832bc46b2ae5a9887fac1e3d5cc76a04846d8c3544875c7f2b40960"
  "7b1dd767c5c1c0156b8d13bb34d4c1d11e014723b10cddc25c93e89a28e7cd96"
  "3f5638267419916c9d4d906ff25f721d3d2e034851ea01566f0d2d6f943550b8"
  "9927e74b3a0638d4cf5701e78e66d77476a4ba68c75831f1c8ea9117ec7f8809"
  "3315eb3c14ca3ff5c03c80fac58f486a14264dd0bb9c168c096f2bd2531ba438"
  "230f667e0332dc09ef08aacbf1992c40ce112192f95dfc14231a3ef515f9a2c7"
  "e01a157b677e0e17815cd738dcda7e6daa268898d006b52b5d3604c439e6c96e"
  "529f1df7d027b0315090ba15d42ef32998cac2efd6783c62f6b11cedf4c548f3"
  "6cfd013f552a05e9fc81156e6d6de593668e0247a3970feae22e285c16d13e62"
  "3f31511c3c16a29cf81b32379f51ead2bd082677b48b1dcc11a66beeb37cc729"
  "01f6efcc8a01c727d99073ceede8e64c654fa3c4612b006e69e22dc663236943"
  "145d8355f50b7847de5d04815124790867fe1752a0013bdf6ce28882b5e0a2fc"
)

for i in "${!MODEL_CHUNKS[@]}"; do
  echo "  下载 chunk $((i+1))/17: ${MODEL_CHUNKS[$i]:0:16}..."
  curl -L "${BASE_URL}/${MODEL_CHUNKS[$i]}" -o "models/chunk_$i" 
done

cat models/chunk_* > models/medium
rm -f models/chunk_*
echo "  AI 模型完成 ($(du -h models/medium | cut -f1))"
echo ""

echo "=========================================="
echo "下载完成！"
echo "=========================================="
echo ""
ls -lh models/medium onnxruntime-web/ort-wasm-simd-threaded.wasm
