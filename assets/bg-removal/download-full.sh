#!/bin/bash
BASE_URL="https://staticimgly.com/@imgly/background-removal-data/1.4.5/dist"

# 下载所有 22 个 medium 模型 chunks
i=0
while IFS= read -r hash; do
  echo "下载 chunk $i: $hash"
  curl -sL "${BASE_URL}/${hash}" -o "models/chunk_$i" &
  i=$((i+1))
done < models/chunks.txt

# 下载 ort-wasm-simd-threaded.wasm chunks
echo "下载 ort-wasm-simd-threaded.wasm..."
curl -sL "${BASE_URL}/onnxruntime-web/ort-wasm-simd-threaded.wasm" -o "onnxruntime-web/ort-wasm-simd-threaded.wasm" &

wait

# 合并模型
echo "合并模型..."
cat models/chunk_* > models/medium
rm -f models/chunk_* models/chunks.txt

echo "完成!"
ls -lh models/medium onnxruntime-web/ort-wasm-simd-threaded.wasm
