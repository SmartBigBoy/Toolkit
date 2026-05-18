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
        uploadArea.classList.remove('dragleave');
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

    // 检测最纯的背景色（只采样角落最边缘）
    const bgColor = detectPureBackgroundColor(data, width, height);

    // 容差阈值
    const tolerance = 45;

    // 方法1：基于颜色的 alpha 混合
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const pixel = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };

            // 计算与背景色的距离
            const dist = colorDistance(pixel, bgColor);

            // 计算 alpha 值（背景越相似 alpha 越低）
            let alpha = 0;
            if (dist < tolerance * 0.7) {
                // 纯背景
                alpha = 0;
            } else if (dist < tolerance) {
                // 边缘过渡区
                alpha = (dist - tolerance * 0.7) / (tolerance * 0.3);
            } else if (dist < tolerance * 1.8) {
                // 头发等接近背景的区域
                alpha = 0.3 + 0.7 * (dist - tolerance) / (tolerance * 0.8);
            } else {
                // 主体
                alpha = 1;
            }

            // 混合颜色
            if (alpha < 1) {
                data[idx] = Math.round(pixel.r * alpha + targetColor.r * (1 - alpha));
                data[idx + 1] = Math.round(pixel.g * alpha + targetColor.g * (1 - alpha));
                data[idx + 2] = Math.round(pixel.b * alpha + targetColor.b * (1 - alpha));
            }
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // 方法2：补充处理边缘
    const edgeCanvas = document.createElement('canvas');
    edgeCanvas.width = width;
    edgeCanvas.height = height;
    const edgeCtx = edgeCanvas.getContext('2d');
    edgeCtx.drawImage(tempCanvas, 0, 0);

    const edgeData = edgeCtx.getImageData(0, 0, width, height);
    const edge = edgeData.data;

    // 边缘检测 - 找到颜色变化剧烈的边界
    for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
            const idx = (y * width + x) * 4;
            const pixel = { r: edge[idx], g: edge[idx + 1], b: edge[idx + 2] };

            // 检查是否接近背景色但周围有主体
            const dist = colorDistance(pixel, bgColor);
            if (dist < tolerance * 1.5) {
                // 检查周围8邻域是否有明显不同的颜色
                let maxDiff = 0;
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nidx = ((y + dy) * width + (x + dx)) * 4;
                        const np = { r: edge[nidx], g: edge[nidx + 1], b: edge[nidx + 2] };
                        const diff = colorDistance(pixel, np);
                        maxDiff = Math.max(maxDiff, diff);
                    }
                }

                // 如果周围颜色差异大，这个点应该是主体边缘
                if (maxDiff > tolerance * 0.8) {
                    // 保持原色或轻微混合
                    const blendFactor = Math.min(1, maxDiff / (tolerance * 1.5));
                    edge[idx] = Math.round(pixel.r * blendFactor + targetColor.r * (1 - blendFactor) * 0.3);
                    edge[idx + 1] = Math.round(pixel.g * blendFactor + targetColor.g * (1 - blendFactor) * 0.3);
                    edge[idx + 2] = Math.round(pixel.b * blendFactor + targetColor.b * (1 - blendFactor) * 0.3);
                }
            }
        }
    }

    edgeCtx.putImageData(edgeData, 0, 0);

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

    ctx.drawImage(edgeCanvas, drawX, drawY, drawWidth, drawHeight);

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

// 检测最纯的背景色 - 只采样最角落的边缘像素
function detectPureBackgroundColor(data, width, height) {
    const samples = [];
    const cornerSize = Math.floor(Math.min(width, height) * 0.06); // 只取最边缘6%

    // 左上角
    for (let y = 0; y < cornerSize; y += 2) {
        for (let x = 0; x < cornerSize; x += 2) {
            const idx = (y * width + x) * 4;
            samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
        }
    }

    // 右上角
    for (let y = 0; y < cornerSize; y += 2) {
        for (let x = width - cornerSize; x < width; x += 2) {
            const idx = (y * width + x) * 4;
            samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
        }
    }

    // 左下角
    for (let y = height - cornerSize; y < height; y += 2) {
        for (let x = 0; x < cornerSize; x += 2) {
            const idx = (y * width + x) * 4;
            samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
        }
    }

    // 右下角
    for (let y = height - cornerSize; y < height; y += 2) {
        for (let x = width - cornerSize; x < width; x += 2) {
            const idx = (y * width + x) * 4;
            samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
        }
    }

    // 四边最边缘
    const edgeStep = 3;
    // 上边
    for (let x = cornerSize; x < width - cornerSize; x += edgeStep) {
        const idx = x * 4;
        samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
    }
    // 下边
    for (let x = cornerSize; x < width - cornerSize; x += edgeStep) {
        const idx = ((height - 1) * width + x) * 4;
        samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
    }
    // 左边
    for (let y = cornerSize; y < height - cornerSize; y += edgeStep) {
        const idx = (y * width + cornerSize) * 4;
        samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
    }
    // 右边
    for (let y = cornerSize; y < height - cornerSize; y += edgeStep) {
        const idx = (y * width + width - cornerSize - 1) * 4;
        samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
    }

    if (samples.length === 0) {
        return { r: 200, g: 200, b: 200 };
    }

    // 使用众数或中位数
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
