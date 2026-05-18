# Background Removal 模型说明

## 当前状态

此目录包含 `@imgly/background-removal@1.4.5` 完整库文件及本地预下载模型。

## 文件结构

```
bg-removal/
├── dist/
│   ├── index.mjs              # ES Module 主文件
│   └── index.cjs               # CommonJS 主文件
├── models/
│   └── medium                  # AI 模型文件 (85MB)
├── onnxruntime-web/
│   └── ort-wasm-simd-threaded.wasm  # ONNX Runtime WASM (11MB)
├── ort-wasm-simd-threaded.wasm      # WASM 副本
├── resources.json              # 模型资源清单
├── package.json
└── README.md
```

## 模型配置

photo.js 中使用以下配置加载本地模型：

```javascript
await removeBackground(image, {
    model: 'medium',
    publicPath: '../assets/bg-removal/'
});
```

## 模型下载说明

模型文件已预下载到本地：

| 文件 | 大小 | 说明 |
|------|------|------|
| models/medium | 85MB | AI 分割模型（medium 版本） |
| ort-wasm-simd-threaded.wasm | 11MB | ONNX Runtime Web WASM |

这些文件是从 `https://staticimgly.com/@imgly/background-removal-data/1.4.5/dist/` 下载的分块文件合并而成。

## 技术架构

```
background-removal@1.4.5
├── dist/index.mjs      → 库主文件
├── models/medium        → AI 模型（已本地化）
└── ort-wasm-simd-threaded.wasm → ONNX Runtime WASM（已本地化）
```

## 重新下载模型

如需重新下载模型，运行：

```bash
cd /workspace/projects/assets/bg-removal
bash download-full.sh
```
