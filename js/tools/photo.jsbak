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
    console.log('[DEBUG] loadBackgroundRemovalModel 被调用！');
    if (modelReady) return true;
    
    const convertBtn = document.getElementById('convertBtn');
    const progressText = document.getElementById('progressText');
    
    try {
        if (progressText) progressText.textContent = '加载 AI 模型中... 0%';
        if (convertBtn) {
            convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>加载模型中...</span>';
            convertBtn.disabled = true;
        }
        
        console.log('[模型] 导入 background-removal 库...');
        
        // 使用本地库文件（从 js/tools/ 到 assets/bg-removal/）
        const bgRemoval = await import('../../assets/bg-removal/dist/index.mjs');
        const { removeBackground, preload } = bgRemoval;
        
        console.log('[模型] 库导入成功，开始预加载...');
        
        // 预加载资源（WASM）
        await preload({
            publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.4.5/dist/',
            progress: (key, current, total) => {
                const pct = total > 0 ? Math.round(current / total * 100) : 0;
                console.log(`[预加载] ${key}: ${current}/${total} (${pct}%)`);
                if (progressText) progressText.textContent = `加载模型资源中... ${pct}%`;
            }
        });
        
        console.log('[模型] 预加载完成!');
        
        // 初始化完成（模型会在首次使用时加载）
        modelReady = true;
        if (progressText) progressText.textContent = 'AI 模型已就绪 ✓';
        updateConvertButton();
        
        return true;
    } catch (error) {
        console.error('模型加载失败:', error);
        if (progressText) progressText.textContent = 'AI 模型加载失败，将使用传统算法';
        return false;
    }
}

function updateConvertButton() {
    const convertBtn = document.getElementById('convertBtn');
    if (!convertBtn) return;
    
    if (processing) {
        convertBtn.textContent = 'AI 分割中...';
        convertBtn.disabled = true;
    } else if (!originalImage) {
        convertBtn.textContent = '请先上传照片';
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

    // 模型将在用户点击"开始转换"时按需加载
});

function handlePhotoUpload(event) {
    console.log('[DEBUG] handlePhotoUpload 被调用');
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
    console.log('[DEBUG] convertPhoto 被调用！');
    if (!originalImage) {
        alert('请先上传照片');
        return;
    }

    const convertBtn = document.getElementById('convertBtn');
    const progressText = document.getElementById('progressText');
    
    processing = true;
    updateConvertButton();
    if (progressText) progressText.textContent = '正在处理，请稍候...';

    try {
        // 尝试 AI 分割（如果模型可用）
        if (modelReady) {
            if (progressText) progressText.textContent = 'AI 分割中... 0%';
            
            const { removeBackground } = await import('../../assets/bg-removal/dist/index.mjs');
            
            const resultBlob = await removeBackground(originalFile, {
                model: 'small',
                publicPath: '../../assets/bg-removal/',
                output: {
                    format: 'image/png',
                    quality: 1,
                },
                progress: (key, current, total) => {
                    if (total > 0) {
                        const pct = Math.round(current / total * 100);
                        if (progressText) progressText.textContent = `AI 分割中... ${pct}%`;
                    }
                }
            });

            bgRemovalBlob = resultBlob;
            await applyBackgroundToCanvas();
        } else {
            // 模型未加载，直接使用传统算法
            if (progressText) progressText.textContent = '使用传统算法处理...';
            await convertWithTraditionalAlgorithm();
        }

        if (progressText) progressText.textContent = '转换完成 ✓';

    } catch (error) {
        console.error('处理失败，使用传统算法:', error);
        if (progressText) progressText.textContent = '使用传统算法处理...';
        
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
    const keepOriginalColor = selectedBgColor === 'keep';
    
    return new Promise((resolve) => {
        const url = URL.createObjectURL(bgRemovalBlob);
        const img = new Image();
        
        img.onload = () => {
            // 创建目标尺寸 canvas
            const canvas = document.createElement('canvas');
            canvas.width = targetSize.width;
            canvas.height = targetSize.height;
            const ctx = canvas.getContext('2d');

            // 如果不保持原色，填充目标背景色
            if (!keepOriginalColor) {
                ctx.fillStyle = selectedBgColor;
                ctx.fillRect(0, 0, targetSize.width, targetSize.height);
            }

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
            const bgText = keepOriginalColor ? '保持原色' : selectedBgName;
            resultBox.style.display = 'block';
            resultPreview.innerHTML = `
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${bgText} ${targetSize.name} - ${targetSize.width} × ${targetSize.height} 像素</p>
                <img src="${canvas.toDataURL()}" alt="转换结果">
            `;

            document.getElementById('downloadBtn').disabled = false;

            URL.revokeObjectURL(url);
            resolve();
        };
        
        img.src = url;
    });
}

// 传统算法 - 完全重写，更激进的边缘处理
async function convertWithTraditionalAlgorithm() {
    const targetSize = photoSizes[selectedSize];
    
    // 如果选择保持原色，直接裁剪尺寸
    if (selectedBgName === 'keep') {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize.width;
        canvas.height = targetSize.height;
        const ctx = canvas.getContext('2d');
        
        // 填充白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetSize.width, targetSize.height);
        
        // 计算缩放比例，保持宽高比并填满（裁剪多余部分）
        const scale = Math.max(targetSize.width / originalImage.width, targetSize.height / originalImage.height);
        const scaledWidth = originalImage.width * scale;
        const scaledHeight = originalImage.height * scale;
        const drawX = (targetSize.width - scaledWidth) / 2;
        const drawY = (targetSize.height - scaledHeight) / 2;
        
        ctx.drawImage(originalImage, drawX, drawY, scaledWidth, scaledHeight);
        
        convertedCanvas = canvas;
        
        const resultBox = document.getElementById('resultBox');
        const resultPreview = document.getElementById('resultPreview');
        resultBox.style.display = 'block';
        resultPreview.innerHTML = `
            <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${selectedSizeName} - ${targetSize.width} × ${targetSize.height} 像素</p>
            <img src="${canvas.toDataURL()}" alt="转换结果">
        `;
        
        document.getElementById('downloadBtn').disabled = false;
        return;
    }
    
    // 如果选择换底色，继续执行换底色逻辑
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

    // 提高容差以捕获更多边缘
    const tolerance = 50;
    const edgeTolerance = 65;

    // 创建蒙版
    const mask = new Uint8Array(width * height);

    // 第一步：基于肤色、头发和背景色的粗略判断
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const bgDist = colorDistance({ r, g, b }, bgColor);
            const isSkin = isSkinColor(r, g, b);
            const isHair = isHairColor(r, g, b, bgColor);

            // 放宽条件：只要不是接近背景色就标记为主体
            if (isSkin || isHair || bgDist > tolerance) {
                mask[y * width + x] = 1;
            }
        }
    }

    // 第二步：区域生长 - 从已标记的像素向外扩展
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 50) {
        changed = false;
        iterations++;

        for (let y = 2; y < height - 2; y++) {
            for (let x = 2; x < width - 2; x++) {
                const idx = y * width + x;
                if (mask[idx]) continue;

                // 检查周围有多少是主体像素
                let neighborCount = 0;
                let minNeighborDist = Infinity;
                const pixel = { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] };

                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const nidx = (y + dy) * width + (x + dx);
                        if (mask[nidx]) {
                            neighborCount++;
                            const nIdx4 = nidx * 4;
                            const dist = colorDistance(pixel, { r: data[nIdx4], g: data[nIdx4 + 1], b: data[nIdx4 + 2] });
                            minNeighborDist = Math.min(minNeighborDist, dist);
                        }
                    }
                }

                // 放宽条件：2个邻居 + 颜色差异不太大
                if (neighborCount >= 2 && minNeighborDist < edgeTolerance) {
                    mask[idx] = 1;
                    changed = true;
                }
            }
        }
    }

    // 第三步：闭运算 - 先膨胀再腐蚀，填充头发缝隙
    for (let i = 0; i < 5; i++) dilateMask(mask, width, height, 1);
    for (let i = 0; i < 3; i++) erodeMask(mask, width, height, 1);

    // 第四步：从中心向外洪水填充，确保主体完整
    const queue = [];
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // 从多个起点开始洪水填充
    const startPoints = [
        [centerX, centerY],
        [centerX, Math.floor(height * 0.3)],
        [centerX, Math.floor(height * 0.7)],
        [Math.floor(width * 0.4), centerY],
        [Math.floor(width * 0.6), centerY]
    ];

    for (const [sx, sy] of startPoints) {
        if (!mask[sy * width + sx]) {
            queue.push([sx, sy]);
            mask[sy * width + sx] = 2; // 标记为洪水填充
        }
    }

    // BFS 洪水填充
    while (queue.length > 0) {
        const [x, y] = queue.shift();
        
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                
                const nidx = ny * width + nx;
                if (mask[nidx] > 0) continue;
                
                const idx = (y * width + x) * 4;
                const nIdx = (ny * width + nx) * 4;
                const dist = colorDistance(
                    { r: data[idx], g: data[idx + 1], b: data[idx + 2] },
                    { r: data[nIdx], g: data[nIdx + 1], b: data[nIdx + 2] }
                );
                
                // 如果颜色接近，且在边缘区域内
                if (dist < edgeTolerance * 1.2) {
                    mask[nidx] = 2;
                    queue.push([nx, ny]);
                }
            }
        }
    }

    // 第五步：再次膨胀确保边缘完整（增加次数确保头发被包含）
    for (let i = 0; i < 10; i++) dilateMask(mask, width, height, 1);

    // 第六步：去除蒙版中的小噪点（小于50像素的区域设为背景）
    removeSmallBlobs(mask, width, height, 50);

    // 第七步：替换背景
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const pixel = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
            const bgDist = colorDistance(pixel, bgColor);

            if (mask[y * width + x]) {
                // 主体区域：接近背景色的边缘像素进行混合
                if (bgDist < tolerance * 2) {
                    const blendFactor = Math.min(1, bgDist / (tolerance * 2));
                    data[idx] = Math.round(pixel.r * blendFactor + targetColor.r * (1 - blendFactor));
                    data[idx + 1] = Math.round(pixel.g * blendFactor + targetColor.g * (1 - blendFactor));
                    data[idx + 2] = Math.round(pixel.b * blendFactor + targetColor.b * (1 - blendFactor));
                }
            } else {
                // 背景区域：直接替换
                data[idx] = targetColor.r;
                data[idx + 1] = targetColor.g;
                data[idx + 2] = targetColor.b;
            }
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // 第七步：边缘羽化 - 让头发边缘更自然
    featherEdges(tempCanvas, mask, width, height, 6);

    // 绘制到目标尺寸
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

// 去除蒙版中的小噪点（连通区域小于threshold的设为0）
function removeSmallBlobs(mask, width, height, threshold) {
    const visited = new Uint8Array(mask.length);
    const queue = [];
    const toRemove = [];
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (mask[idx] && !visited[idx]) {
                toRemove.length = 0;
                queue.length = 0;
                queue.push([x, y]);
                visited[idx] = 1;
                
                while (queue.length > 0) {
                    const [cx, cy] = queue.shift();
                    toRemove.push([cx, cy]);
                    
                    const neighbors = [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nidx = ny * width + nx;
                            if (mask[nidx] && !visited[nidx]) {
                                visited[nidx] = 1;
                                queue.push([nx, ny]);
                            }
                        }
                    }
                }
                
                // 如果区域太小，标记为背景
                if (toRemove.length < threshold) {
                    for (const [rx, ry] of toRemove) {
                        mask[ry * width + rx] = 0;
                    }
                }
            }
        }
    }
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

function featherEdges(canvas, mask, width, height, radius) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const newMask = new Uint8Array(mask);
    const queue = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (newMask[idx] === 1) {
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nidx = ny * width + nx;
                            if (newMask[nidx] === 0) {
                                newMask[nidx] = 2;
                                queue.push([nx, ny]);
                            }
                        }
                    }
                }
            }
        }
    }

    while (queue.length > 0) {
        const [x, y] = queue.shift();
        const idx = y * width + x;
        if (newMask[idx] !== 2) continue;

        let subjectCount = 0;
        let total = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nidx = ny * width + nx;
                    if (newMask[nidx] === 1) subjectCount++;
                    total++;
                }
            }
        }

        const ratio = subjectCount / total;
        if (ratio > 0.2) {
            newMask[idx] = 3;
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const mval = newMask[idx];
            if (mval >= 2 && mval <= 3) {
                const blendFactor = (mval === 3) ? 0.3 : (mval - 2) * 0.3;
                const i = idx * 4;
                data[i] = Math.round(data[i] * blendFactor);
                data[i + 1] = Math.round(data[i + 1] * blendFactor);
                data[i + 2] = Math.round(data[i + 2] * blendFactor);
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}
