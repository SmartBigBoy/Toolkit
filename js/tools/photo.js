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

    const canvas = document.createElement('canvas');
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;

    const ctx = canvas.getContext('2d');
    
    // 使用选中的底色填充背景
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 创建临时 canvas 处理原图
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0);

    // 获取图像数据
    const imageData = tempCtx.getImageData(0, 0, originalImage.width, originalImage.height);
    const data = imageData.data;

    // 检测原图四边角的颜色作为背景色参考
    const cornerColors = [
        getPixelColor(data, originalImage.width, 0, 0), // 左上
        getPixelColor(data, originalImage.width, originalImage.width - 1, 0), // 右上
        getPixelColor(data, originalImage.width, 0, originalImage.height - 1), // 左下
        getPixelColor(data, originalImage.width, originalImage.width - 1, originalImage.height - 1) // 右下
    ];

    // 取平均作为背景色
    const bgColor = {
        r: Math.round((cornerColors[0].r + cornerColors[1].r + cornerColors[2].r + cornerColors[3].r) / 4),
        g: Math.round((cornerColors[0].g + cornerColors[1].g + cornerColors[2].g + cornerColors[3].g) / 4),
        b: Math.round((cornerColors[0].b + cornerColors[1].b + cornerColors[2].b + cornerColors[3].b) / 4)
    };

    // 目标颜色
    const targetColor = hexToRgb(selectedBgColor);

    // 颜色容差阈值
    const tolerance = 60;

    // 替换边缘区域的背景色（扫描线算法）
    const width = originalImage.width;
    const height = originalImage.height;

    for (let y = 0; y < height; y++) {
        // 从左向右扫描
        let leftEdge = -1;
        for (let x = 0; x < width / 2; x++) {
            const pixel = getPixelColor(data, width, x, y);
            if (!isSimilarColor(pixel, bgColor, tolerance * 1.5)) {
                leftEdge = x;
                break;
            }
        }

        // 从右向左扫描
        let rightEdge = -1;
        for (let x = width - 1; x >= width / 2; x--) {
            const pixel = getPixelColor(data, width, x, y);
            if (!isSimilarColor(pixel, bgColor, tolerance * 1.5)) {
                rightEdge = x;
                break;
            }
        }

        // 替换边缘背景
        if (leftEdge > 0) {
            for (let x = 0; x < leftEdge; x++) {
                setPixelColor(data, width, x, y, targetColor);
            }
        }
        if (rightEdge > 0 && rightEdge < width - 1) {
            for (let x = rightEdge + 1; x < width; x++) {
                setPixelColor(data, width, x, y, targetColor);
            }
        }

        // 替换顶部和底部边缘背景
        if (y < 20 || y > height - 20) {
            for (let x = 0; x < width; x++) {
                const pixel = getPixelColor(data, width, x, y);
                if (isSimilarColor(pixel, bgColor, tolerance)) {
                    setPixelColor(data, width, x, y, targetColor);
                }
            }
        }
    }

    // 将处理后的图像放回临时 canvas
    tempCtx.putImageData(imageData, 0, 0);

    // 计算缩放和位置
    const scale = Math.min(canvas.width / originalImage.width, canvas.height / originalImage.height);
    const x = (canvas.width - originalImage.width * scale) / 2;
    const y = (canvas.height - originalImage.height * scale) / 2;

    ctx.drawImage(tempCanvas, x, y, originalImage.width * scale, originalImage.height * scale);

    convertedCanvas = canvas;

    // 显示结果区域
    const resultBox = document.getElementById('resultBox');
    const resultPreview = document.getElementById('resultPreview');
    resultBox.style.display = 'block';
    resultPreview.innerHTML = `
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${selectedBgName} ${targetSize.name} - ${targetSize.width} × ${targetSize.height} 像素</p>
        <img src="${canvas.toDataURL()}" alt="转换结果">
    `;

    document.getElementById('downloadBtn').disabled = false;
}

// 辅助函数：获取像素颜色
function getPixelColor(data, width, x, y) {
    const i = (y * width + x) * 4;
    return {
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        a: data[i + 3]
    };
}

// 辅助函数：设置像素颜色
function setPixelColor(data, width, x, y, color) {
    const i = (y * width + x) * 4;
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
    data[i + 3] = 255;
}

// 辅助函数：判断两个颜色是否相似
function isSimilarColor(c1, c2, tolerance) {
    const dr = Math.abs(c1.r - c2.r);
    const dg = Math.abs(c1.g - c2.g);
    const db = Math.abs(c1.b - c2.b);
    return dr + dg + db < tolerance * 3;
}

// 辅助函数：Hex转RGB
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