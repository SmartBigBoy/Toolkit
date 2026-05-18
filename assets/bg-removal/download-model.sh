#!/bin/bash
# 下载 background-removal 模型文件
# 模型使用分块存储，需要下载并合并

BASE_URL="https://staticimgly.com/@imgly/background-removal-data/1.4.5/dist"

mkdir -p models onnxruntime-web

echo "=== 下载 ONNX Runtime WASM ==="
# 下载 ort-wasm-simd-threaded.wasm
curl -sL "${BASE_URL}/onnxruntime-web/ort-wasm-simd-threaded.wasm" -o "onnxruntime-web/ort-wasm-simd-threaded.wasm" &

echo "=== 下载 Medium 模型 Chunks ==="
# medium 模型 chunks (按顺序)
chunks=(
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

for i in "${!chunks[@]}"; do
  echo "下载 chunk $((i+1))/17: ${chunks[$i]}"
  curl -sL "${BASE_URL}/${chunks[$i]}" -o "models/chunk_$i" &
done

wait

echo "=== 合并模型文件 ==="
cat models/chunk_* > models/medium
rm -f models/chunk_*

echo "=== 文件大小 ==="
ls -lh models/medium onnxruntime-web/ort-wasm-simd-threaded.wasm
