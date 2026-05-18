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
    const targetColor = hexToRgb(selectedBgColor);

    // 创建临时 canvas 处理原图
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

    // 主体优先洪水填充
    const mask = createSubjectMask(data, width, height, bgColor);

    // 替换背景
    for (let i = 0; i < width * height; i++) {
        if (!mask[i]) {
            // 背景像素
            data[i * 4] = targetColor.r;
            data[i * 4 + 1] = targetColor.g;
            data[i * 4 + 2] = targetColor.b;
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // 创建目标尺寸 canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;
    const ctx = canvas.getContext('2d');

    // 填充目标背景
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, targetSize.width, targetSize.height);

    // 缩放并居中绘制
    const scale = Math.min(targetSize.width / originalImage.width, targetSize.height / originalImage.height);
    const drawWidth = originalImage.width * scale;
    const drawHeight = originalImage.height * scale;
    const drawX = (targetSize.width - drawWidth) / 2;
    const drawY = (targetSize.height - drawHeight) / 2;

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

// 检测背景色
function detectBackgroundColor(data, width, height) {
    const samples = [];
    const edgeWidth = Math.floor(Math.min(width, height) * 0.12);
    const step = 4;

    // 上边
    for (let x = edgeWidth; x < width - edgeWidth; x += step) {
        const i = x * 4;
        samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    // 下边
    for (let x = edgeWidth; x < width - edgeWidth; x += step) {
        const i = ((height - 1) * width + x) * 4;
        samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    // 左边
    for (let y = edgeWidth; y < height - edgeWidth; y += step) {
        const i = (y * width + edgeWidth) * 4;
        samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    // 右边
    for (let y = edgeWidth; y < height - edgeWidth; y += step) {
        const i = (y * width + width - edgeWidth - 1) * 4;
        samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    // 四角
    const cornerSize = Math.floor(Math.min(width, height) * 0.08);
    for (let y = 0; y < cornerSize; y += 3) {
        for (let x = 0; x < cornerSize; x += 3) {
            const i = (y * width + x) * 4;
            samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
            const i2 = (y * width + width - 1 - x) * 4;
            samples.push({ r: data[i2], g: data[i2 + 1], b: data[i2 + 2] });
            const i3 = ((height - 1 - y) * width + x) * 4;
            samples.push({ r: data[i3], g: data[i3 + 1], b: data[i3 + 2] });
            const i4 = ((height - 1 - y) * width + width - 1 - x) * 4;
            samples.push({ r: data[i4], g: data[i4 + 1], b: data[i4 + 2] });
        }
    }

    // 中位数
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

// 创建主体蒙版 - 主体优先洪水填充
function createSubjectMask(data, width, height, bgColor) {
    const mask = new Uint8Array(width * height);
    const visited = new Uint8Array(width * height);
    const queue = [];

    // 从中心向外找非背景的起始点
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);

    // 以中心点为起点，螺旋向外找主体
    const tolerance = 60;

    queue.push([cx, cy]);
    visited[cy * width + cx] = 1;

    while (queue.length > 0) {
        const [x, y] = queue.shift();
        const idx = y * width + x;
        const pixel = { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] };

        // 只要不是纯背景色，就标记为主体
        if (colorDistance(pixel, bgColor) > tolerance * 0.4) {
            mask[idx] = 1;

            // 4邻域扩散
            const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nidx = ny * width + nx;
                    if (!visited[nidx]) {
                        visited[nidx] = 1;
                        const np = { r: data[nidx * 4], g: data[nidx * 4 + 1], b: data[nidx * 4 + 2] };
                        // 只要与背景色有差异就继续扩展
                        if (colorDistance(np, bgColor) > tolerance * 0.3) {
                            queue.push([nx, ny]);
                        }
                    }
                }
            }
        }
    }

    // 迭代扩展蒙版（填充头发等接近背景的区域）
    for (let iter = 0; iter < 8; iter++) {
        const prevMask = mask.slice();

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (prevMask[idx]) continue;

                // 8邻域中主体像素的数量
                let subjectCount = 0;
                let totalCount = 0;

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        totalCount++;
                        if (prevMask[(y + dy) * width + (x + dx)]) {
                            subjectCount++;
                        }
                    }
                }

                // 如果周围超过一半是主体，或者距离主体很近，加入蒙版
                if (subjectCount / totalCount > 0.5) {
                    mask[idx] = 1;
                } else if (subjectCount >= 2) {
                    // 允许边缘区域更宽松的条件
                    const pixel = { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] };
                    if (colorDistance(pixel, bgColor) < tolerance * 2.5) {
                        mask[idx] = 1;
                    }
                }
            }
        }

        // 检查是否到达边缘
        let reachedEdge = false;
        for (let x = 0; x < width && !reachedEdge; x++) {
            if (mask[x] || mask[(height - 1) * width + x]) reachedEdge = true;
        }
        for (let y = 0; y < height && !reachedEdge; y++) {
            if (mask[y * width] || mask[y * width + width - 1]) reachedEdge = true;
        }

        if (reachedEdge && iter > 2) break;
    }

    return mask;
}

// 计算颜色距离
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
