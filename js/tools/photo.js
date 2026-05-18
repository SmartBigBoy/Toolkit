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

    // 创建临时 canvas
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
    const tolerance = 40;

    // 步骤1：创建粗略的蒙版
    const mask = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const pixel = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
        const dist = colorDistance(pixel, bgColor);
        mask[i] = dist > tolerance ? 1 : 0;
    }

    // 步骤2：形态学膨胀 - 填充头发缝隙
    for (let iter = 0; iter < 5; iter++) {
        const newMask = erodeDilate(mask, width, height, true);
        for (let i = 0; i < mask.length; i++) mask[i] = newMask[i];
    }

    // 步骤3：形态学腐蚀 - 去除噪点
    for (let iter = 0; iter < 2; iter++) {
        const newMask = erodeDilate(mask, width, height, false);
        for (let i = 0; i < mask.length; i++) mask[i] = newMask[i];
    }

    // 步骤4：边缘平滑 - 羽化处理
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (mask[idx]) continue;

            // 查找距离最近的蒙版内像素
            let minDist = Infinity;
            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const ny = y + dy;
                    const nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        if (mask[ny * width + nx]) {
                            const d = Math.sqrt(dx * dx + dy * dy);
                            minDist = Math.min(minDist, d);
                        }
                    }
                }
            }

            // 根据距离进行颜色混合
            if (minDist < 5) {
                const blendFactor = Math.min(1, minDist / 5);
                const pixel = { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] };

                // 混合到目标色
                data[idx * 4] = Math.round(pixel.r * blendFactor + targetColor.r * (1 - blendFactor));
                data[idx * 4 + 1] = Math.round(pixel.g * blendFactor + targetColor.g * (1 - blendFactor));
                data[idx * 4 + 2] = Math.round(pixel.b * blendFactor + targetColor.b * (1 - blendFactor));
            }
        }
    }

    // 步骤5：直接替换纯背景区域
    for (let i = 0; i < width * height; i++) {
        if (!mask[i]) {
            // 找周围最近的蒙版距离
            let minDist = 10;
            const y = Math.floor(i / width);
            const x = i % width;

            outer:
            for (let r = 1; r < 10; r++) {
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            if (mask[ny * width + nx]) {
                                minDist = r;
                                break outer;
                            }
                        }
                    }
                }
            }

            // 只有远离主体的背景才直接替换
            if (minDist > 3) {
                data[i * 4] = targetColor.r;
                data[i * 4 + 1] = targetColor.g;
                data[i * 4 + 2] = targetColor.b;
            }
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // 创建目标尺寸 canvas
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

// 形态学膨胀/腐蚀
function erodeDilate(mask, width, height, dilate) {
    const newMask = new Uint8Array(mask.length);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;

            if (dilate) {
                // 膨胀：周围有一个是1就是1
                let hasOne = mask[idx];
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (mask[(y + dy) * width + (x + dx)]) hasOne = 1;
                    }
                }
                newMask[idx] = hasOne;
            } else {
                // 腐蚀：周围全是1才是1
                let allOne = mask[idx];
                for (let dy = -1; dy <= 1 && allOne; dy++) {
                    for (let dx = -1; dx <= 1 && allOne; dx++) {
                        if (!mask[(y + dy) * width + (x + dx)]) allOne = 0;
                    }
                }
                newMask[idx] = allOne;
            }
        }
    }

    return newMask;
}

// 检测背景色
function detectBackgroundColor(data, width, height) {
    const samples = [];
    const cornerSize = Math.floor(Math.min(width, height) * 0.05);

    // 四角采样
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
