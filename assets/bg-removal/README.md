# Background Removal 模型说明

## 当前状态

此目录包含 `@imgly/background-removal@1.7.0` 完整库文件。

## 文件结构

```
bg-removal/
├── dist/
│   ├── index.mjs          # ES Module 主文件
│   └── index.cjs           # CommonJS 主文件
├── ort-wasm-simd-threaded.wasm  # ONNX Runtime Web WASM 文件（4.3MB）
├── package.json
└── README.md
```

## 模型文件说明

AI 模型文件（.onnx，大约 20-80MB）**不在此目录中**，因为它们是动态下载的：
- 首次使用时从 CDN 动态下载
- 下载后自动缓存到用户浏览器的 IndexedDB 中
- 后续使用从 IndexedDB 读取，无需再次下载

## 技术架构

```
background-removal@1.7.0
├── dist/index.mjs    → 库主文件（已下载）
├── dist/index.cjs    → 库主文件（已下载）
├── ort-wasm-simd-threaded.wasm  → WASM 运行时（已下载）
└── 模型文件（首次运行时从 CDN 下载）
    └── 缓存到 IndexedDB
```

## 使用说明

在 `photo.js` 中配置：
```javascript
// 从本地加载库
const { removeBackground } = await import('../assets/bg-removal/dist/index.mjs');

// 首次调用会下载并缓存模型到 IndexedDB
await removeBackground(imageFile, {
    model: 'small',
    progress: (key, current, total) => { ... }
});
```

## 模型缓存

用户首次使用时：
1. 浏览器从 CDN 下载模型文件（约 30MB）
2. 模型缓存到 IndexedDB
3. 后续使用秒开

如需清除缓存：浏览器开发者工具 → Application → IndexedDB → 删除
