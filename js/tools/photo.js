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

function convertPhoto() {
    if (!originalImage) {
        alert('请先上传照片');
        return;
    }

    const targetSize = photoSizes[selectedSize];

    // 创建目标尺寸的 canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;
    const ctx = canvas.getContext('2d');

    // 创建原图尺寸的临时 canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0);

    // 获取图像数据
    const imageData = tempCtx.getImageData(0, 0, originalImage.width, originalImage.height);
    const data = imageData.data;
    const width = originalImage.width;
    const height = originalImage.height;

    // ========== 步骤1：采样检测背景色 ==========
    const bgColor = detectBackgroundColor(data, width, height);

    // 目标颜色
    const targetColor = hexToRgb(selectedBgColor);

    // 颜色容差阈值
    const tolerance = 50;

    // ========== 步骤2：创建背景蒙版 ==========
    const mask = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const pixel = {
            r: data[i * 4],
            g: data[i * 4 + 1],
            b: data[i * 4 + 2]
        };
        mask[i] = isBackgroundPixel(pixel, bgColor, tolerance) ? 1 : 0;
    }

    // ========== 步骤3：连通性分析，保留主体区域 ==========
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const visited = new Uint8Array(width * height);

    // BFS 从中心点开始标记连通区域
    const queue = [];
    queue.push([centerX, centerY]);
    visited[centerY * width + centerX] = 1;

    while (queue.length > 0) {
        const [x, y] = queue.shift();

        const neighbors = [
            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
            [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = ny * width + nx;
                if (!visited[idx]) {
                    const pixel = { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] };
                    const centerPixel = { r: data[(centerY * width + centerX) * 4], 
                                         g: data[(centerY * width + centerX) * 4 + 1], 
                                         b: data[(centerY * width + centerX) * 4 + 2] };

                    if (isSimilarColor(pixel, centerPixel, tolerance * 2) || !isBackgroundPixel(pixel, bgColor, tolerance)) {
                        visited[idx] = 1;
                        queue.push([nx, ny]);
                    }
                }
            }
        }
    }

    // ========== 步骤4：边缘羽化处理 ==========
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;

            if (mask[idx] && visited[idx]) {
                continue;
            }

            if (mask[idx]) {
                let hasSubjectNeighbor = false;
                let subjectCount = 0;
                let totalWeight = 0;

                for (let dy = -3; dy <= 3; dy++) {
                    for (let dx = -3; dx <= 3; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nidx = ny * width + nx;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const weight = 1 / (1 + dist);

                            if (visited[nidx]) {
                                subjectCount += weight;
                            }
                            totalWeight += weight;
                        }
                    }
                }

                const blendRatio = subjectCount / totalWeight;
                if (blendRatio > 0.1) {
                    const originalPixel = {
                        r: data[idx * 4],
                        g: data[idx * 4 + 1],
                        b: data[idx * 4 + 2]
                    };

                    const blendFactor = Math.min(blendRatio * 2, 1);
                    data[idx * 4] = Math.round(originalPixel.r * (1 - blendFactor) + targetColor.r * blendFactor);
                    data[idx * 4 + 1] = Math.round(originalPixel.g * (1 - blendFactor) + targetColor.g * blendFactor);
                    data[idx * 4 + 2] = Math.round(originalPixel.b * (1 - blendFactor) + targetColor.b * blendFactor);
                } else {
                    data[idx * 4] = targetColor.r;
                    data[idx * 4 + 1] = targetColor.g;
                    data[idx * 4 + 2] = targetColor.b;
                }
                data[idx * 4 + 3] = 255;
            }
        }
    }

    // 将处理后的图像放回临时 canvas
    tempCtx.putImageData(imageData, 0, 0);

    // ========== 步骤5：绘制到目标尺寸 ==========
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scale = Math.min(canvas.width / originalImage.width, canvas.height / originalImage.height);
    const drawWidth = originalImage.width * scale;
    const drawHeight = originalImage.height * scale;
    const drawX = (canvas.width - drawWidth) / 2;
    const drawY = (canvas.height - drawHeight) / 2;

    ctx.drawImage(tempCanvas, drawX, drawY, drawWidth, drawHeight);

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
}

// ========== 辅助函数 ==========

// 检测背景色：从边缘采样
function detectBackgroundColor(data, width, height) {
    const samples = [];

    // 采集边缘样本
    for (let i = 0; i < width; i += Math.floor(width / 10)) {
        // 顶部
        samples.push({ r: data[i * 4], g: data[i * 4 + 1], b: data[i * 4 + 2] });
        // 底部
        const bottomIdx = (height - 1) * width * 4 + i * 4;
        samples.push({ r: data[bottomIdx], g: data[bottomIdx + 1], b: data[bottomIdx + 2] });
    }
    for (let i = 0; i < height; i += Math.floor(height / 10)) {
        // 左侧
        const leftIdx = i * width * 4;
        samples.push({ r: data[leftIdx], g: data[leftIdx + 1], b: data[leftIdx + 2] });
        // 右侧
        const rightIdx = i * width * 4 + (width - 1) * 4;
        samples.push({ r: data[rightIdx], g: data[rightIdx + 1], b: data[rightIdx + 2] });
    }

    // 计算平均颜色
    let totalR = 0, totalG = 0, totalB = 0;
    for (const c of samples) {
        totalR += c.r;
        totalG += c.g;
        totalB += c.b;
    }

    return {
        r: Math.round(totalR / samples.length),
        g: Math.round(totalG / samples.length),
        b: Math.round(totalB / samples.length)
    };
}

// 判断像素是否为背景
function isBackgroundPixel(pixel, bgColor, tolerance) {
    return isSimilarColor(pixel, bgColor, tolerance);
}

// 判断两个颜色是否相似（欧几里得距离）
function isSimilarColor(c1, c2, tolerance) {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    return distance < tolerance;
}

// Hex转RGB
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
