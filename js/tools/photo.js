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

    // ========== 步骤1：检测背景色 ==========
    const bgColor = detectBackgroundColor(data, width, height);

    // 目标颜色
    const targetColor = hexToRgb(selectedBgColor);

    // ========== 步骤2：计算容差 ==========
    const tolerance = calculateTolerance(data, width, height, bgColor);

    // ========== 步骤3：从中心洪水填充主体 ==========
    const subjectMask = floodFillSubject(data, width, height, bgColor, tolerance);

    // ========== 步骤4：扩展蒙版（填充头发等接近主体颜色的区域） ==========
    expandMaskWithEdgeDetection(data, width, height, subjectMask, bgColor, tolerance);

    // ========== 步骤5：替换背景 ==========
    for (let i = 0; i < width * height; i++) {
        if (subjectMask[i]) {
            // 主体像素：检查边缘是否接近背景色，进行渐变混合
            const pixel = { r: data[i * 4], g: data[i * 4 + 1], b: data[i * 4 + 2] };
            const dist = colorDistance(pixel, bgColor);

            // 边缘区域进行平滑过渡
            if (dist < tolerance * 1.2) {
                const blendFactor = Math.max(0, (dist - tolerance * 0.5) / (tolerance * 0.7));
                data[i * 4] = Math.round(pixel.r * blendFactor + targetColor.r * (1 - blendFactor));
                data[i * 4 + 1] = Math.round(pixel.g * blendFactor + targetColor.g * (1 - blendFactor));
                data[i * 4 + 2] = Math.round(pixel.b * blendFactor + targetColor.b * (1 - blendFactor));
            }
        } else {
            // 背景像素，直接替换
            data[i * 4] = targetColor.r;
            data[i * 4 + 1] = targetColor.g;
            data[i * 4 + 2] = targetColor.b;
            data[i * 4 + 3] = 255;
        }
    }

    // 将处理后的图像放回临时 canvas
    tempCtx.putImageData(imageData, 0, 0);

    // ========== 步骤6：绘制到目标尺寸 ==========
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

// 检测背景色
function detectBackgroundColor(data, width, height) {
    const samples = [];
    const cornerSize = Math.floor(Math.min(width, height) * 0.2);

    // 四角区域采样
    // 左上角
    for (let y = 0; y < cornerSize; y += 3) {
        for (let x = 0; x < cornerSize; x += 3) {
            const idx = y * width + x;
            samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
        }
    }

    // 右上角
    for (let y = 0; y < cornerSize; y += 3) {
        for (let x = width - cornerSize; x < width; x += 3) {
            const idx = y * width + x;
            samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
        }
    }

    // 左下角
    for (let y = height - cornerSize; y < height; y += 3) {
        for (let x = 0; x < cornerSize; x += 3) {
            const idx = y * width + x;
            samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
        }
    }

    // 右下角
    for (let y = height - cornerSize; y < height; y += 3) {
        for (let x = width - cornerSize; x < width; x += 3) {
            const idx = y * width + x;
            samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
        }
    }

    // 四边中点
    for (let x = Math.floor(width / 4); x < Math.floor(width * 3 / 4); x += 5) {
        const idx = x;
        samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
        const idx2 = (height - 1) * width + x;
        samples.push({ r: data[idx2 * 4], g: data[idx2 * 4 + 1], b: data[idx2 * 4 + 2] });
    }
    for (let y = Math.floor(height / 4); y < Math.floor(height * 3 / 4); y += 5) {
        const idx = y * width;
        samples.push({ r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] });
        const idx2 = y * width + (width - 1);
        samples.push({ r: data[idx2 * 4], g: data[idx2 * 4 + 1], b: data[idx2 * 4 + 2] });
    }

    // 使用中位数
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

// 计算容差
function calculateTolerance(data, width, height, bgColor) {
    const samples = [];
    const cornerSize = Math.floor(Math.min(width, height) * 0.15);

    // 采集边缘样本
    for (let y = 0; y < cornerSize; y += 2) {
        for (let x = 0; x < cornerSize; x += 2) {
            const idx = y * width + x;
            samples.push(colorDistance(
                { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] },
                bgColor
            ));
        }
        for (let x = width - cornerSize; x < width; x += 2) {
            const idx = y * width + x;
            samples.push(colorDistance(
                { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] },
                bgColor
            ));
        }
    }
    for (let y = height - cornerSize; y < height; y += 2) {
        for (let x = 0; x < cornerSize; x += 2) {
            const idx = y * width + x;
            samples.push(colorDistance(
                { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] },
                bgColor
            ));
        }
        for (let x = width - cornerSize; x < width; x += 2) {
            const idx = y * width + x;
            samples.push(colorDistance(
                { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] },
                bgColor
            ));
        }
    }

    if (samples.length === 0) return 60;

    // 计算标准差
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    // 容差 = 平均值 + 标准差 + 余量
    return Math.max(50, Math.min(100, mean + stdDev + 15));
}

// 从中心洪水填充主体
function floodFillSubject(data, width, height, bgColor, tolerance) {
    const mask = new Uint8Array(width * height);
    const visited = new Uint8Array(width * height);

    // 从图像中心附近多个点开始
    const startPoints = [
        [Math.floor(width / 2), Math.floor(height / 2)],
        [Math.floor(width / 2), Math.floor(height / 3)],
        [Math.floor(width / 2), Math.floor(height * 2 / 3)]
    ];

    const queue = [];

    for (const [sx, sy] of startPoints) {
        const sidx = sy * width + sx;
        const pixel = { r: data[sidx * 4], g: data[sidx * 4 + 1], b: data[sidx * 4 + 2] };

        // 如果起始点不是背景，加入队列
        if (colorDistance(pixel, bgColor) > tolerance * 0.8) {
            queue.push([sx, sy]);
            visited[sidx] = 1;
        }
    }

    // 如果中心点都是背景，向外扩展找肤色/主体
    if (queue.length === 0) {
        for (let r = 10; r < Math.min(width, height) / 3; r += 10) {
            for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
                const sx = Math.floor(width / 2 + Math.cos(angle) * r);
                const sy = Math.floor(height / 2 + Math.sin(angle) * r);
                if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                    const sidx = sy * width + sx;
                    const pixel = { r: data[sidx * 4], g: data[sidx * 4 + 1], b: data[sidx * 4 + 2] };
                    if (colorDistance(pixel, bgColor) > tolerance * 0.5) {
                        queue.push([sx, sy]);
                        visited[sidx] = 1;
                        break;
                    }
                }
            }
            if (queue.length > 0) break;
        }
    }

    // 洪水填充：4邻域
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
                    const dist = colorDistance(pixel, bgColor);

                    // 只要不是纯背景色就加入（使用较大容差）
                    if (dist > tolerance * 0.5) {
                        visited[nidx] = 1;
                        queue.push([nx, ny]);
                    }
                }
            }
        }
    }

    // 复制到蒙版
    for (let i = 0; i < width * height; i++) {
        mask[i] = visited[i];
    }

    return mask;
}

// 边缘扩展蒙版
function expandMaskWithEdgeDetection(data, width, height, mask, bgColor, tolerance) {
    // 多次迭代扩展蒙版
    for (let iter = 0; iter < 5; iter++) {
        const newMask = new Uint8Array(mask.length);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;

                if (mask[idx]) {
                    newMask[idx] = 1;
                } else {
                    // 检查周围8邻域有多少是主体
                    let subjectNeighbors = 0;
                    let totalNeighbors = 0;

                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nidx = (y + dy) * width + (x + dx);
                            if (mask[nidx]) subjectNeighbors++;
                            totalNeighbors++;
                        }
                    }

                    // 如果周围超过60%是主体，这个像素也加入
                    if (subjectNeighbors / totalNeighbors > 0.6) {
                        newMask[idx] = 1;
                    }
                }
            }
        }

        // 检查是否已达到边界
        let reachedEdge = false;
        for (let x = 0; x < width; x++) {
            if (newMask[x] || newMask[(height - 1) * width + x]) {
                reachedEdge = true;
                break;
            }
        }
        if (!reachedEdge) {
            for (let y = 0; y < height; y++) {
                if (newMask[y * width] || newMask[y * width + width - 1]) {
                    reachedEdge = true;
                    break;
                }
            }
        }

        // 如果已到达边界，停止扩展
        if (reachedEdge && iter > 0) break;

        // 更新蒙版
        for (let i = 0; i < mask.length; i++) {
            mask[i] = newMask[i];
        }
    }
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
