const photoSizes = {
    '1inch': { width: 295, height: 413, name: '一寸照片' },
    'small1inch': { width: 260, height: 378, name: '小一寸照片' },
    'large1inch': { width: 390, height: 567, name: '大一寸照片' },
    '2inch': { width: 413, height: 579, name: '二寸照片' },
    'small2inch': { width: 390, height: 567, name: '小二寸照片' },
    'passport': { width: 390, height: 567, name: '护照照片' },
    'idcard': { width: 358, height: 441, name: '身份证照片' }
};

let originalImage = null;
let originalFile = null;
let convertedCanvas = null;
let selectedSize = '1inch';
let bgRemovalBlob = null;  // 保存 AI 抠图结果

// 状态管理
let modelReady = false;
let processing = false;

// 加载背景移除模型
async function loadBackgroundRemovalModel() {
    if (modelReady) return true;
    
    const convertBtn = document.getElementById('convertBtn');
    const statusText = document.getElementById('conversionStatus');
    
    try {
        if (statusText) statusText.textContent = '加载 AI 模型中...';
        if (convertBtn) {
            convertBtn.textContent = '加载模型中...';
            convertBtn.disabled = true;
        }
        
        // 动态导入 background-removal 库（使用本地文件）
        const { removeBackground } = await import('../assets/bg-removal/dist/index.mjs');
        
        // 预热模型：用 1x1 透明 PNG 触发模型下载
        const tiny = await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
            .then(r => r.blob());
        
        await removeBackground(tiny, {
            model: 'small',
            progress: (key, current, total) => {
                if (total > 0) {
                    const pct = Math.round(current / total * 100);
                    if (statusText) statusText.textContent = `加载模型中 ${pct}%...`;
                }
            }
        });
        
        modelReady = true;
        if (statusText) statusText.textContent = 'AI 模型已就绪';
        updateConvertButton();
        
        return true;
    } catch (error) {
        console.error('模型加载失败:', error);
        if (statusText) statusText.textContent = 'AI 模型加载失败，将使用传统算法';
        return false;
    }
}

function updateConvertButton() {
    const convertBtn = document.getElementById('convertBtn');
    if (!convertBtn) return;
    
    if (!modelReady) {
        convertBtn.textContent = '加载模型中...';
        convertBtn.disabled = true;
    } else if (!originalImage) {
        convertBtn.textContent = '请先上传照片';
        convertBtn.disabled = true;
    } else if (processing) {
        convertBtn.textContent = 'AI 分割中...';
        convertBtn.disabled = true;
    } else {
        convertBtn.textContent = '开始转换';
        convertBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.size-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.size-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedSize = option.dataset.size;
            
            const sizeInfo = photoSizes[selectedSize];
            document.getElementById('selectedSizeName').textContent = sizeInfo.name;
            document.getElementById('selectedSizeInfo').style.display = 'block';
        });
    });

    document.querySelector('.size-option[data-size="1inch"]').click();

    const uploadArea = document.getElementById('uploadArea');
    const photoUpload = document.getElementById('photoUpload');

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            photoUpload.files = files;
            handlePhotoUpload({ target: photoUpload });
        }
    });

    uploadArea.addEventListener('click', (e) => {
        if (e.target !== uploadArea && !e.target.classList.contains('upload-btn')) {
            photoUpload.click();
        }
    });

    // 预加载模型
    loadBackgroundRemovalModel();
});

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    originalFile = file;  // 保存原始文件用于 AI 处理
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            const preview = document.getElementById('photoPreview');
            preview.innerHTML = `
                <img src="${e.target.result}" alt="预览">
                <p style="margin-top: 12px; font-size: 13px; color: var(--text-secondary);">原始尺寸: ${img.width} × ${img.height} 像素</p>
            `;
            document.getElementById('convertBtn').disabled = false;
            document.getElementById('downloadBtn').disabled = true;
            bgRemovalBlob = null;  // 清空之前的抠图结果
            
            updateConvertButton();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

let selectedBgColor = '#FFFFFF';
let selectedBgName = '白底';

function selectBgColor(el) {
    document.querySelectorAll('.bg-color-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedBgColor = el.dataset.color;
    selectedBgName = el.dataset.name;
    
    // 如果已有抠图结果，直接应用新背景
    if (bgRemovalBlob) {
        applyBackgroundToCanvas();
    }
}

async function convertPhoto() {
    if (!originalImage) {
        alert('请先上传照片');
        return;
    }

    const convertBtn = document.getElementById('convertBtn');
    const statusText = document.getElementById('conversionStatus');
    
    processing = true;
    updateConvertButton();
    if (statusText) statusText.textContent = '正在 AI 分割，请稍候...';

    try {
        // 确保模型已加载
        if (!modelReady) {
            const loaded = await loadBackgroundRemovalModel();
            if (!loaded) {
                throw new Error('AI 模型加载失败');
            }
        }

        // 使用 @imgly/background-removal 进行 AI 抠图
        const { removeBackground } = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm');
        
        const resultBlob = await removeBackground(originalFile, {
            model: 'small',       // 'small' 速度快，'medium' 更精准
            output: {
                format: 'image/png',
                quality: 1,
            },
            progress: (key, current, total) => {
                if (total > 0) {
                    const pct = Math.round(current / total * 100);
                    if (statusText) statusText.textContent = `AI 分割中 ${pct}%...`;
                }
            }
        });

        bgRemovalBlob = resultBlob;
        
        // 应用背景色并生成目标尺寸
        await applyBackgroundToCanvas();

        if (statusText) statusText.textContent = '转换完成 ✓';

    } catch (error) {
        console.error('AI 分割失败，回退到传统算法:', error);
        if (statusText) statusText.textContent = 'AI 分割失败，使用传统算法...';
        
        // 回退到传统算法
        await convertWithTraditionalAlgorithm();
    } finally {
        processing = false;
        updateConvertButton();
    }
}

// 应用背景色到抠图结果
async function applyBackgroundToCanvas() {
    if (!bgRemovalBlob || !originalImage) return;

    const targetSize = photoSizes[selectedSize];
    
    return new Promise((resolve) => {
        const url = URL.createObjectURL(bgRemovalBlob);
        const img = new Image();
        
        img.onload = () => {
            // 创建目标尺寸 canvas
            const canvas = document.createElement('canvas');
            canvas.width = targetSize.width;
            canvas.height = targetSize.height;
            const ctx = canvas.getContext('2d');

            // 填充目标背景色
            ctx.fillStyle = selectedBgColor;
            ctx.fillRect(0, 0, targetSize.width, targetSize.height);

            // 绘制 AI 抠图后的人像（保持透明通道）
            const scale = Math.min(
                targetSize.width / originalImage.width,
                targetSize.height / originalImage.height
            );
            const drawWidth = originalImage.width * scale;
            const drawHeight = originalImage.height * scale;
            const drawX = (targetSize.width - drawWidth) / 2;
            const drawY = (targetSize.height - drawHeight) / 2;

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

            convertedCanvas = canvas;

            // 显示结果
            const resultBox = document.getElementById('resultBox');
            const resultPreview = document.getElementById('resultPreview');
            resultBox.style.display = 'block';
            resultPreview.innerHTML = `
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${selectedBgName} ${targetSize.name} - ${targetSize.width} × ${targetSize.height} 像素</p>
                <img src="${canvas.toDataURL()}" alt="转换结果">
            `;

            document.getElementById('downloadBtn').disabled = false;

            URL.revokeObjectURL(url);
            resolve();
        };
        
        img.src = url;
    });
}

// 传统算法回退
async function convertWithTraditionalAlgorithm() {
    const targetSize = photoSizes[selectedSize];
    const targetColor = hexToRgb(selectedBgColor);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, originalImage.width, originalImage.height);
    const data = imageData.data;
    const width = originalImage.width;
    const height = originalImage.height;

    // 检测背景色
    const bgColor = detectBackgroundColor(data, width, height);

    // 容差
    const tolerance = 35;

    // 创建蒙版
    const mask = new Uint8Array(width * height);

    // 基于肤色和背景色的判断
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const bgDist = colorDistance({ r, g, b }, bgColor);
            const isSkin = isSkinColor(r, g, b);
            const isHair = isHairColor(r, g, b, bgColor);

            if (isSkin || isHair || bgDist > tolerance * 1.2) {
                mask[y * width + x] = 1;
            }
        }
    }

    // 区域生长
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 30) {
        changed = false;
        iterations++;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (mask[idx]) continue;

                let neighborCount = 0;
                let maxNeighborDist = 0;

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nidx = (y + dy) * width + (x + dx);
                        if (mask[nidx]) {
                            neighborCount++;
                            const nIdx4 = nidx * 4;
                            const cIdx4 = idx * 4;
                            const dist = colorDistance(
                                { r: data[cIdx4], g: data[cIdx4 + 1], b: data[cIdx4 + 2] },
                                { r: data[nIdx4], g: data[nIdx4 + 1], b: data[nIdx4 + 2] }
                            );
                            maxNeighborDist = Math.max(maxNeighborDist, dist);
                        }
                    }
                }

                if (neighborCount >= 3 && maxNeighborDist < tolerance) {
                    mask[idx] = 1;
                    changed = true;
                }
            }
        }
    }

    // 形态学清理
    for (let i = 0; i < 3; i++) dilateMask(mask, width, height, 1);
    for (let i = 0; i < 2; i++) erodeMask(mask, width, height, 1);

    // 边缘羽化替换
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const pixel = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };

            if (mask[y * width + x]) {
                const bgDist = colorDistance(pixel, bgColor);
                if (bgDist < tolerance * 1.5) {
                    const blendFactor = Math.min(1, bgDist / (tolerance * 1.5));
                    data[idx] = Math.round(pixel.r * blendFactor + targetColor.r * (1 - blendFactor) * 0.5);
                    data[idx + 1] = Math.round(pixel.g * blendFactor + targetColor.g * (1 - blendFactor) * 0.5);
                    data[idx + 2] = Math.round(pixel.b * blendFactor + targetColor.b * (1 - blendFactor) * 0.5);
                }
            } else {
                data[idx] = targetColor.r;
                data[idx + 1] = targetColor.g;
                data[idx + 2] = targetColor.b;
            }
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    const canvas = document.createElement('canvas');
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, targetSize.width, targetSize.height);

    const scale = Math.min(targetSize.width / originalImage.width, targetSize.height / originalImage.height);
    const drawWidth = originalImage.width * scale;
    const drawHeight = originalImage.height * scale;
    const drawX = (targetSize.width - drawWidth) / 2;
    const drawY = (targetSize.height - drawHeight) / 2;

    ctx.drawImage(tempCanvas, drawX, drawY, drawWidth, drawHeight);

    convertedCanvas = canvas;

    const resultBox = document.getElementById('resultBox');
    const resultPreview = document.getElementById('resultPreview');
    resultBox.style.display = 'block';
    resultPreview.innerHTML = `
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${selectedBgName} ${targetSize.name} - ${targetSize.width} × ${targetSize.height} 像素</p>
        <img src="${canvas.toDataURL()}" alt="转换结果">
    `;

    document.getElementById('downloadBtn').disabled = false;
}

// 肤色检测
function isSkinColor(r, g, b) {
    if (r < 80 || g < 40 || b < 30) return false;
    if (r < g || r < b) return false;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 60 || max > 240) return false;
    if (r < max * 0.4) return false;
    return true;
}

// 头发颜色检测
function isHairColor(r, g, b, bgColor) {
    const brightness = (r + g + b) / 3;
    const bgBrightness = (bgColor.r + bgColor.g + bgColor.b) / 3;
    if (brightness > bgBrightness * 1.1) return false;
    if (brightness > 180) return false;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = (max - min) / max;
    return saturation < 0.5 && brightness < bgBrightness;
}

// 膨胀蒙版
function dilateMask(mask, width, height, radius) {
    const newMask = new Uint8Array(mask.length);
    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            let found = mask[y * width + x];
            if (!found) {
                for (let dy = -radius; dy <= radius && !found; dy++) {
                    for (let dx = -radius; dx <= radius && !found; dx++) {
                        if (mask[(y + dy) * width + (x + dx)]) found = 1;
                    }
                }
            }
            newMask[y * width + x] = found;
        }
    }
    for (let i = 0; i < mask.length; i++) mask[i] = newMask[i];
}

// 腐蚀蒙版
function erodeMask(mask, width, height, radius) {
    const newMask = new Uint8Array(mask.length);
    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            let all = mask[y * width + x];
            if (all) {
                for (let dy = -radius; dy <= radius && all; dy++) {
                    for (let dx = -radius; dx <= radius && all; dx++) {
                        if (!mask[(y + dy) * width + (x + dx)]) all = 0;
                    }
                }
            }
            newMask[y * width + x] = all;
        }
    }
    for (let i = 0; i < mask.length; i++) mask[i] = newMask[i];
}

// 检测背景色
function detectBackgroundColor(data, width, height) {
    const samples = [];
    const cornerSize = Math.floor(Math.min(width, height) * 0.06);

    for (let y = 0; y < cornerSize; y += 2) {
        for (let x = 0; x < cornerSize; x += 2) {
            const i = (y * width + x) * 4;
            samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
        }
    }
    for (let y = 0; y < cornerSize; y += 2) {
        for (let x = width - cornerSize; x < width; x += 2) {
            const i = (y * width + x) * 4;
            samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
        }
    }
    for (let y = height - cornerSize; y < height; y += 2) {
        for (let x = 0; x < cornerSize; x += 2) {
            const i = (y * width + x) * 4;
            samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
        }
    }
    for (let y = height - cornerSize; y < height; y += 2) {
        for (let x = width - cornerSize; x < width; x += 2) {
            const i = (y * width + x) * 4;
            samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
        }
    }

    if (samples.length === 0) return { r: 200, g: 200, b: 200 };

    const sortedR = samples.map(c => c.r).sort((a, b) => a - b);
    const sortedG = samples.map(c => c.g).sort((a, b) => a - b);
    const sortedB = samples.map(c => c.b).sort((a, b) => a - b);

    return {
        r: sortedR[Math.floor(samples.length / 2)],
        g: sortedG[Math.floor(samples.length / 2)],
        b: sortedB[Math.floor(samples.length / 2)]
    };
}

function colorDistance(c1, c2) {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

function downloadPhoto() {
    if (!convertedCanvas) return;
    const targetSize = photoSizes[selectedSize];
    const link = document.createElement('a');
    link.download = `${targetSize.name}.png`;
    link.href = convertedCanvas.toDataURL('image/png');
    link.click();
}
