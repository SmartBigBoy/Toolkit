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
let convertedCanvas = null;
let selectedSize = '1inch';
let segmenter = null;
let segmenterLoading = false;

// 初始化 MediaPipe Selfie Segmentation
async function initSegmenter() {
    if (segmenter) return segmenter;
    if (segmenterLoading) {
        // 等待加载完成
        while (segmenterLoading) {
            await new Promise(r => setTimeout(r, 100));
        }
        return segmenter;
    }

    segmenterLoading = true;
    
    try {
        const { SelfieSegmentation } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js');
        
        segmenter = new SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        });

        segmenter.setOptions({
            modelSelection: 1, // 0: general, 1: landscape
            selfieMode: false
        });

        await segmenter.initialize();
        segmenterLoading = false;
        return segmenter;
    } catch (error) {
        console.error('MediaPipe 加载失败:', error);
        segmenterLoading = false;
        return null;
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

    // 预加载分割模型
    initSegmenter();
});

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

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
            
            // 预加载模型
            initSegmenter();
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
}

async function convertPhoto() {
    if (!originalImage) {
        alert('请先上传照片');
        return;
    }

    const convertBtn = document.getElementById('convertBtn');
    const originalText = convertBtn.textContent;
    convertBtn.textContent = 'AI 分割中...';
    convertBtn.disabled = true;

    try {
        // 初始化/等待分割模型
        const seg = await initSegmenter();
        
        if (!seg) {
            // 回退到传统算法
            await convertWithTraditionalAlgorithm();
            return;
        }

        const targetSize = photoSizes[selectedSize];
        const targetColor = hexToRgb(selectedBgColor);

        // 创建临时 canvas 用于处理
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalImage.width;
        tempCanvas.height = originalImage.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(originalImage, 0, 0);

        // 使用 MediaPipe 进行分割
        const segmentationMask = await seg.segment(tempCanvas);

        // 创建带透明度的结果
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = originalImage.width;
        resultCanvas.height = originalImage.height;
        const resultCtx = resultCanvas.getContext('2d');

        // 绘制原图
        resultCtx.drawImage(tempCanvas, 0, 0);

        // 创建蒙版图像
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = originalImage.width;
        maskCanvas.height = originalImage.height;
        const maskCtx = maskCanvas.getContext('2d');

        // 将分割结果绘制到蒙版
        const maskData = maskCtx.createImageData(originalImage.width, originalImage.height);
        for (let i = 0; i < segmentationMask.length; i++) {
            const value = segmentationMask[i];
            // value 是 0-1 的概率，表示背景概率
            // 我们需要的是人物概率
            const personProb = 1 - value;
            const idx = i * 4;
            maskData.data[idx] = 255;
            maskData.data[idx + 1] = 255;
            maskData.data[idx + 2] = 255;
            maskData.data[idx + 3] = Math.round(personProb * 255);
        }
        maskCtx.putImageData(maskData, 0, 0);

        // 应用蒙版
        resultCtx.globalCompositeOperation = 'destination-in';
        resultCtx.drawImage(maskCanvas, 0, 0);

        // 创建目标尺寸 canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetSize.width;
        canvas.height = targetSize.height;
        const ctx = canvas.getContext('2d');

        // 填充目标背景色
        ctx.fillStyle = selectedBgColor;
        ctx.fillRect(0, 0, targetSize.width, targetSize.height);

        // 绘制分割后的人像
        const scale = Math.min(targetSize.width / originalImage.width, targetSize.height / originalImage.height);
        const drawWidth = originalImage.width * scale;
        const drawHeight = originalImage.height * scale;
        const drawX = (targetSize.width - drawWidth) / 2;
        const drawY = (targetSize.height - drawHeight) / 2;

        ctx.drawImage(resultCanvas, drawX, drawY, drawWidth, drawHeight);

        convertedCanvas = canvas;

        const resultBox = document.getElementById('resultBox');
        const resultPreview = document.getElementById('resultPreview');
        resultBox.style.display = 'block';
        resultPreview.innerHTML = `
            <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${selectedBgName} ${targetSize.name} - ${targetSize.width} × ${targetSize.height} 像素</p>
            <img src="${canvas.toDataURL()}" alt="转换结果">
        `;

        document.getElementById('downloadBtn').disabled = false;

    } catch (error) {
        console.error('分割失败:', error);
        // 回退到传统算法
        await convertWithTraditionalAlgorithm();
    } finally {
        convertBtn.textContent = originalText;
        convertBtn.disabled = false;
    }
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
