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

    // ========== 步骤1：检测背景色（改进：四角+边缘采样） ==========
    const bgColor = detectBackgroundColor(data, width, height);

    // 目标颜色
    const targetColor = hexToRgb(selectedBgColor);

    // ========== 步骤2：计算自适应容差 ==========
    const tolerance = calculateAdaptiveTolerance(data, width, height, bgColor);

    // ========== 步骤3：创建主体蒙版（改进：种子填充算法） ==========
    const subjectMask = createSubjectMask(data, width, height, bgColor, tolerance);

    // ========== 步骤4：替换背景 ==========
    for (let i = 0; i < width * height; i++) {
        if (!subjectMask[i]) {
            // 不是主体像素，替换为背景色
            data[i * 4] = targetColor.r;
            data[i * 4 + 1] = targetColor.g;
            data[i * 4 + 2] = targetColor.b;
            data[i * 4 + 3] = 255;
        } else {
            // 主体像素：检查是否接近背景色，进行轻微调整
            const pixel = {
                r: data[i * 4],
                g: data[i * 4 + 1],
                b: data[i * 4 + 2]
            };

            // 如果主体像素颜色接近背景，进行渐变混合
            const dist = colorDistance(pixel, bgColor);
            if (dist < tolerance * 1.5) {
                // 边缘区域，进行颜色混合
                const blendFactor = Math.max(0, (dist - tolerance * 0.5) / (tolerance));
                data[i * 4] = Math.round(pixel.r * blendFactor + targetColor.r * (1 - blendFactor));
                data[i * 4 + 1] = Math.round(pixel.g * blendFactor + targetColor.g * (1 - blendFactor));
                data[i * 4 + 2] = Math.round(pixel.b * blendFactor + targetColor.b * (1 - blendFactor));
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

// 改进的背景色检测：四角+边缘分段采样
function detectBackgroundColor(data, width, height) {
    const samples = [];
    const cornerSize = Math.floor(Math.min(width, height) * 0.15); // 只取边缘15%区域

    // 左上角
    for (let y = 0; y < cornerSize; y += 2) {
        for (let x = 0; x < cornerSize; x += 2) {
            const idx = y * width + x;
            samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
        }
    }

    // 右上角
    for (let y = 0; y < cornerSize; y += 2) {
        for (let x = width - cornerSize; x < width; x += 2) {
            const idx = y * width + x;
            samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
        }
    }

    // 左下角
    for (let y = height - cornerSize; y < height; y += 2) {
        for (let x = 0; x < cornerSize; x += 2) {
            const idx = y * width + x;
            samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
        }
    }

    // 右下角
    for (let y = height - cornerSize; y < height; y += 2) {
        for (let x = width - cornerSize; x < width; x += 2) {
            const idx = y * width + x;
            samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
        }
    }

    // 顶部边缘中间
    for (let x = cornerSize; x < width - cornerSize; x += 3) {
        const idx = x;
        samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
    }

    // 底部边缘中间
    for (let x = cornerSize; x < width - cornerSize; x += 3) {
        const idx = (height - 1) * width + x;
        samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
    }

    // 左侧边缘中间
    for (let y = cornerSize; y < height - cornerSize; y += 3) {
        const idx = y * width;
        samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
    }

    // 右侧边缘中间
    for (let y = cornerSize; y < height - cornerSize; y += 3) {
        const idx = y * width + (width - 1);
        samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
    }

    // 计算中位数颜色（更抗噪声）
    const sortedR = samples.map(c => c.r).sort((a, b) => a - b);
    const sortedG = samples.map(c => c.g).sort((a, b) => a - b);
    const sortedB = samples.map(c => c.b).sort((a, b) => a - b);
    const mid = Math.floor(samples.length / 2);

    return {
        r: sortedR[mid],
        g: sortedG[mid],
        b: sortedB[mid]
    };
}

// 计算自适应容差
function calculateAdaptiveTolerance(data, width, height, bgColor) {
    const samples = [];
    const cornerSize = Math.floor(Math.min(width, height) * 0.1);

    // 采集边缘样本计算方差
    for (let y = 0; y < cornerSize; y += 2) {
        for (let x = 0; x < cornerSize; x += 2) {
            const idx = y * width + x;
            const d = colorDistance(
                { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] },
                bgColor
            );
            samples.push(d);
        }
        for (let x = width - cornerSize; x < width; x += 2) {
            const idx = y * width + x;
            const d = colorDistance(
                { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] },
                bgColor
            );
            samples.push(d);
        }
    }

    if (samples.length === 0) return 50;

    // 使用样本的标准差来调整容差
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    // 容差 = 背景色到自身的距离 + 标准差（保证背景被替换）+ 一定余量
    return Math.max(40, Math.min(80, mean + stdDev * 0.5 + 10));
}

// 创建主体蒙版（改进：洪水填充算法）
function createSubjectMask(data, width, height, bgColor, tolerance) {
    const mask = new Uint8Array(width * height);
    const visited = new Uint8Array(width * height);

    // 找到背景区域并标记
    const queue = [];

    // 从四个角落开始（通常是背景）
    const corners = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1],
        [Math.floor(width / 2), 0],
        [Math.floor(width / 2), height - 1],
        [0, Math.floor(height / 2)],
        [width - 1, Math.floor(height / 2)]
    ];

    for (const [startX, startY] of corners) {
        const startIdx = startY * width + startX;
        const pixel = { r: data[startIdx * 4], g: data[startIdx * 4 + 1], b: data[startIdx * 4 + 2] };

        if (colorDistance(pixel, bgColor) < tolerance * 2) {
            queue.push([startX, startY]);
            visited[startIdx] = 1;
        }
    }

    // 洪水填充：从背景向内扩散
    while (queue.length > 0) {
        const [x, y] = queue.shift();
        const idx = y * width + x;

        const neighbors = [
            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nidx = ny * width + nx;
                if (!visited[nidx]) {
                    const pixel = { r: data[nidx * 4], g: data[nidx * 4 + 1], b: data[nidx * 4 + 2] };

                    if (colorDistance(pixel, bgColor) < tolerance * 1.8) {
                        visited[nidx] = 1;
                        queue.push([nx, ny]);
                    }
                }
            }
        }
    }

    // 反转：标记为主体区域
    for (let i = 0; i < width * height; i++) {
        mask[i] = visited[i] ? 0 : 1;
    }

    return mask;
}

// 计算颜色距离（欧几里得）
function colorDistance(c1, c2) {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
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
