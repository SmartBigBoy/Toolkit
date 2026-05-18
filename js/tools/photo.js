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

// WebGL 相关
let gl = null;
let program = null;
let texture = null;
let positionBuffer = null;
let texCoordBuffer = null;

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

            // 初始化 WebGL
            initWebGL();
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

    // 实时更新 WebGL 渲染
    if (gl && texture) {
        updateWebGLRender();
    }
}

// ========== WebGL 初始化 ==========
function initWebGL() {
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;

    gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
        console.warn('WebGL 不可用，使用 Canvas 2D 回退');
        return false;
    }

    // 顶点着色器
    const vsSource = `
        attribute vec4 aPosition;
        attribute vec2 aTexCoord;
        varying vec2 vTexCoord;
        void main() {
            gl_Position = aPosition;
            vTexCoord = aTexCoord;
        }
    `;

    // 片段着色器 - GPU 加速背景替换
    const fsSource = `
        precision highp float;
        varying vec2 vTexCoord;
        uniform sampler2D uTexture;
        uniform vec2 uTextureSize;
        uniform vec3 uBgColor;
        uniform vec3 uTargetColor;
        uniform float uTolerance;

        // 计算颜色距离
        float colorDistance(vec3 c1, vec3 c2) {
            vec3 d = c1 - c2;
            return sqrt(dot(d, d));
        }

        // 检测是否为边缘
        bool isEdge(vec2 uv, vec3 bgColor, float tol) {
            vec2 texel = 1.0 / uTextureSize;
            vec3 center = texture2D(uTexture, uv).rgb;

            // 检查上下左右四个邻居
            float sumDist = 0.0;
            int count = 0;

            vec3 left = texture2D(uTexture, uv + vec2(-texel.x, 0.0)).rgb;
            vec3 right = texture2D(uTexture, uv + vec2(texel.x, 0.0)).rgb;
            vec3 top = texture2D(uTexture, uv + vec2(0.0, texel.y)).rgb;
            vec3 bottom = texture2D(uTexture, uv + vec2(0.0, -texel.y)).rgb;

            float d1 = colorDistance(left, center);
            float d2 = colorDistance(right, center);
            float d3 = colorDistance(top, center);
            float d4 = colorDistance(bottom, center);

            return (d1 + d2 + d3 + d4) > tol * 4.0;
        }

        void main() {
            vec4 color = texture2D(uTexture, vTexCoord);
            vec3 rgb = color.rgb;

            // 计算与背景色的距离
            float dist = colorDistance(rgb, uBgColor);

            // 边缘检测 - 检查是否为边缘像素
            bool onEdge = isEdge(vTexCoord, uBgColor, uTolerance * 0.5);

            // 主体蒙版计算
            // 如果颜色接近背景，标记为需要替换
            float bgWeight = smoothstep(uTolerance * 0.5, uTolerance * 1.5, dist);

            // 边缘区域进行混合
            if (onEdge && dist < uTolerance * 1.8) {
                // 边缘处进行平滑过渡
                float blendFactor = dist / (uTolerance * 1.8);
                vec3 mixedColor = mix(uTargetColor, rgb, blendFactor);
                gl_FragColor = vec4(mixedColor, 1.0);
            } else if (bgWeight < 0.1) {
                // 纯背景区域
                gl_FragColor = vec4(uTargetColor, 1.0);
            } else {
                // 主体区域
                gl_FragColor = vec4(rgb, 1.0);
            }
        }
    `;

    // 编译着色器
    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('着色器链接失败:', gl.getProgramInfoLog(program));
        return false;
    }

    // 创建纹理
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, originalImage);

    // 创建顶点缓冲区
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
    ]), gl.STATIC_DRAW);

    texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0, 1,
        1, 1,
        0, 0,
        0, 0,
        1, 1,
        1, 0
    ]), gl.STATIC_DRAW);

    return true;
}

function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('着色器编译失败:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// ========== WebGL 渲染 ==========
function updateWebGLRender() {
    if (!gl || !program) return;

    const targetColor = hexToRgb(selectedBgColor);

    // 使用原图四角采样估算背景色
    const bgColor = detectBgColorFromImage();

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program);

    // 设置 uniforms
    const uTexture = gl.getUniformLocation(program, 'uTexture');
    const uTextureSize = gl.getUniformLocation(program, 'uTextureSize');
    const uBgColor = gl.getUniformLocation(program, 'uBgColor');
    const uTargetColor = gl.getUniformLocation(program, 'uTargetColor');
    const uTolerance = gl.getUniformLocation(program, 'uTolerance');

    gl.uniform1i(uTexture, 0);
    gl.uniform2f(uTextureSize, gl.canvas.width, gl.canvas.height);
    gl.uniform3f(uBgColor, bgColor.r, bgColor.g, bgColor.b);
    gl.uniform3f(uTargetColor, targetColor.r / 255.0, targetColor.g / 255.0, targetColor.b / 255.0);
    gl.uniform1f(uTolerance, 50.0);

    // 绑定纹理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // 绑定顶点
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

    // 绘制
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// 从图像数据检测背景色
function detectBgColorFromImage() {
    if (!originalImage) return { r: 200, g: 200, b: 200 };

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(originalImage, 0, 0);

    const imageData = ctx.getImageData(0, 0, originalImage.width, originalImage.height);
    const data = imageData.data;

    const cornerSize = Math.floor(Math.min(originalImage.width, originalImage.height) * 0.15);
    const samples = [];

    // 四角采样
    for (let y = 0; y < cornerSize; y += 3) {
        for (let x = 0; x < cornerSize; x += 3) {
            const idx = (y * originalImage.width + x) * 4;
            samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
        }
    }
    for (let y = 0; y < cornerSize; y += 3) {
        for (let x = originalImage.width - cornerSize; x < originalImage.width; x += 3) {
            const idx = (y * originalImage.width + x) * 4;
            samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
        }
    }
    for (let y = originalImage.height - cornerSize; y < originalImage.height; y += 3) {
        for (let x = 0; x < cornerSize; x += 3) {
            const idx = (y * originalImage.width + x) * 4;
            samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
        }
    }
    for (let y = originalImage.height - cornerSize; y < originalImage.height; y += 3) {
        for (let x = originalImage.width - cornerSize; x < originalImage.width; x += 3) {
            const idx = (y * originalImage.width + x) * 4;
            samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
        }
    }

    // 计算中位数
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

// ========== 转换功能 ==========
function convertPhoto() {
    if (!originalImage) {
        alert('请先上传照片');
        return;
    }

    const targetSize = photoSizes[selectedSize];
    const targetColor = hexToRgb(selectedBgColor);

    // 创建目标尺寸的 canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;
    const ctx = canvas.getContext('2d');

    // 检测背景色
    const bgColor = detectBgColorFromImage();

    // 如果 WebGL 可用，使用 WebGL 处理
    if (gl && program) {
        // 更新 WebGL uniforms
        updateWebGLRenderWithBgColor(bgColor, targetColor);

        // 获取 WebGL 处理后的图像
        const glCanvas = gl.canvas;
        ctx.drawImage(glCanvas, 0, 0, targetSize.width, targetSize.height);
    } else {
        // 回退到 Canvas 2D 处理
        processWithCanvas2D(ctx, targetSize, bgColor, targetColor);
    }

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

function updateWebGLRenderWithBgColor(bgColor, targetColor) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program);

    const uTexture = gl.getUniformLocation(program, 'uTexture');
    const uTextureSize = gl.getUniformLocation(program, 'uTextureSize');
    const uBgColor = gl.getUniformLocation(program, 'uBgColor');
    const uTargetColor = gl.getUniformLocation(program, 'uTargetColor');
    const uTolerance = gl.getUniformLocation(program, 'uTolerance');

    gl.uniform1i(uTexture, 0);
    gl.uniform2f(uTextureSize, gl.canvas.width, gl.canvas.height);
    gl.uniform3f(uBgColor, bgColor.r / 255.0, bgColor.g / 255.0, bgColor.b / 255.0);
    gl.uniform3f(uTargetColor, targetColor.r / 255.0, targetColor.g / 255.0, targetColor.b / 255.0);
    gl.uniform1f(uTolerance, 50.0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// Canvas 2D 回退处理
function processWithCanvas2D(ctx, targetSize, bgColor, targetColor) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, originalImage.width, originalImage.height);
    const data = imageData.data;
    const width = originalImage.width;
    const height = originalImage.height;

    const tolerance = 50;

    // 洪水填充从中心扩展主体
    const mask = floodFillSubject(data, width, height, bgColor, tolerance);

    // 扩展蒙版
    for (let iter = 0; iter < 3; iter++) {
        expandMask(data, width, height, mask, bgColor, tolerance);
    }

    // 替换背景
    for (let i = 0; i < width * height; i++) {
        const pixel = { r: data[i * 4], g: data[i * 4 + 1], b: data[i * 4 + 2] };
        const dist = colorDistance(pixel, bgColor);

        if (!mask[i]) {
            data[i * 4] = targetColor.r;
            data[i * 4 + 1] = targetColor.g;
            data[i * 4 + 2] = targetColor.b;
        } else if (dist < tolerance * 1.5) {
            const blendFactor = Math.max(0, (dist - tolerance * 0.5) / (tolerance));
            data[i * 4] = Math.round(pixel.r * blendFactor + targetColor.r * (1 - blendFactor));
            data[i * 4 + 1] = Math.round(pixel.g * blendFactor + targetColor.g * (1 - blendFactor));
            data[i * 4 + 2] = Math.round(pixel.b * blendFactor + targetColor.b * (1 - blendFactor));
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // 绘制到目标尺寸
    ctx.fillStyle = `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`;
    ctx.fillRect(0, 0, targetSize.width, targetSize.height);

    const scale = Math.min(targetSize.width / originalImage.width, targetSize.height / originalImage.height);
    const drawWidth = originalImage.width * scale;
    const drawHeight = originalImage.height * scale;
    const drawX = (targetSize.width - drawWidth) / 2;
    const drawY = (targetSize.height - drawHeight) / 2;

    ctx.drawImage(tempCanvas, drawX, drawY, drawWidth, drawHeight);
}

function floodFillSubject(data, width, height, bgColor, tolerance) {
    const mask = new Uint8Array(width * height);
    const visited = new Uint8Array(width * height);
    const queue = [];

    // 从中心开始
    const sx = Math.floor(width / 2);
    const sy = Math.floor(height / 2);
    queue.push([sx, sy]);
    visited[sy * width + sx] = 1;

    while (queue.length > 0) {
        const [x, y] = queue.shift();
        const idx = y * width + x;
        const pixel = { r: data[idx * 4], g: data[idx * 4 + 1], b: data[idx * 4 + 2] };

        if (colorDistance(pixel, bgColor) > tolerance * 0.5) {
            mask[idx] = 1;

            const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nidx = ny * width + nx;
                    if (!visited[nidx]) {
                        const np = { r: data[nidx * 4], g: data[nidx * 4 + 1], b: data[nidx * 4 + 2] };
                        if (colorDistance(np, bgColor) > tolerance * 0.4) {
                            visited[nidx] = 1;
                            queue.push([nx, ny]);
                        }
                    }
                }
            }
        }
    }

    return mask;
}

function expandMask(data, width, height, mask, bgColor, tolerance) {
    const newMask = new Uint8Array(mask.length);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (mask[idx]) {
                newMask[idx] = 1;
            } else {
                let count = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (mask[(y+dy) * width + (x+dx)]) count++;
                    }
                }
                if (count >= 5) newMask[idx] = 1;
            }
        }
    }

    for (let i = 0; i < mask.length; i++) {
        mask[i] = newMask[i];
    }
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
