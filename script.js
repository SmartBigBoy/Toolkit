document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initTextTools();
    initColorPicker();
    initCurrentTime();
    initUnitConverter();
    initCurrencyConverter();
});

function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const toolSections = document.querySelectorAll('.tool-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const toolId = this.dataset.tool;
            
            navBtns.forEach(b => b.classList.remove('active'));
            toolSections.forEach(s => s.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(toolId).classList.add('active');
        });
    });
}

function initTextTools() {
    const wordCountInput = document.getElementById('wordCountInput');
    if (wordCountInput) {
        wordCountInput.addEventListener('input', updateWordCount);
    }
}

function updateWordCount() {
    const text = document.getElementById('wordCountInput').value;
    document.getElementById('charCount').textContent = text.length;
    document.getElementById('wordCount').textContent = text.trim() ? text.trim().split(/\s+/).length : 0;
    document.getElementById('lineCount').textContent = text.split('\n').length;
}

function toUpperCase() {
    const input = document.getElementById('caseInput');
    input.value = input.value.toUpperCase();
}

function toLowerCase() {
    const input = document.getElementById('caseInput');
    input.value = input.value.toLowerCase();
}

function toCapitalize() {
    const input = document.getElementById('caseInput');
    input.value = input.value.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function reverseText() {
    const input = document.getElementById('reverseInput');
    input.value = input.value.split('').reverse().join('');
}

function formatJson() {
    const input = document.getElementById('jsonInput');
    const result = document.getElementById('jsonResult');
    try {
        const json = JSON.parse(input.value);
        input.value = JSON.stringify(json, null, 2);
        result.textContent = '✅ JSON格式化成功';
        result.className = 'result success';
    } catch (e) {
        result.textContent = '❌ JSON格式错误: ' + e.message;
        result.className = 'result error';
    }
}

function compressJson() {
    const input = document.getElementById('jsonInput');
    const result = document.getElementById('jsonResult');
    try {
        const json = JSON.parse(input.value);
        input.value = JSON.stringify(json);
        result.textContent = '✅ JSON压缩成功';
        result.className = 'result success';
    } catch (e) {
        result.textContent = '❌ JSON格式错误: ' + e.message;
        result.className = 'result error';
    }
}

function validateJson() {
    const input = document.getElementById('jsonInput');
    const result = document.getElementById('jsonResult');
    try {
        JSON.parse(input.value);
        result.textContent = '✅ JSON格式正确';
        result.className = 'result success';
    } catch (e) {
        result.textContent = '❌ JSON格式错误: ' + e.message;
        result.className = 'result error';
    }
}

async function copyJson() {
    const input = document.getElementById('jsonInput');
    const result = document.getElementById('jsonResult');
    try {
        await navigator.clipboard.writeText(input.value);
        result.textContent = '✅ 已复制到剪贴板';
        result.className = 'result success';
    } catch (e) {
        input.select();
        document.execCommand('copy');
        result.textContent = '✅ 已复制到剪贴板';
        result.className = 'result success';
    }
}

function base64Encode() {
    const input = document.getElementById('base64Input');
    try {
        input.value = btoa(unescape(encodeURIComponent(input.value)));
    } catch (e) {
        alert('编码失败: ' + e.message);
    }
}

function base64Decode() {
    const input = document.getElementById('base64Input');
    try {
        input.value = decodeURIComponent(escape(atob(input.value)));
    } catch (e) {
        alert('解码失败: ' + e.message);
    }
}

function urlEncode() {
    const input = document.getElementById('urlInput');
    input.value = encodeURIComponent(input.value);
}

function urlDecode() {
    const input = document.getElementById('urlInput');
    input.value = decodeURIComponent(input.value);
}

function htmlEncode() {
    const input = document.getElementById('htmlInput');
    input.value = input.value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function htmlDecode() {
    const input = document.getElementById('htmlInput');
    const div = document.createElement('div');
    div.innerHTML = input.value;
    input.value = div.textContent || div.innerText;
}

function convertBase() {
    const fromBase = parseInt(document.getElementById('baseFrom').value);
    const toBase = parseInt(document.getElementById('baseTo').value);
    const input = document.getElementById('baseInput').value;
    
    try {
        const decimal = parseInt(input, fromBase);
        if (isNaN(decimal)) {
            document.getElementById('baseResult').textContent = '无效的输入';
            return;
        }
        const result = decimal.toString(toBase).toUpperCase();
        document.getElementById('baseResult').textContent = `结果: ${result}`;
    } catch (e) {
        document.getElementById('baseResult').textContent = '转换失败';
    }
}

async function handleHashFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const algorithm = document.getElementById('hashAlgorithm').value;
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        document.getElementById('hashResult').textContent = `${algorithm}: ${hashHex}`;
    } catch (e) {
        document.getElementById('hashResult').textContent = '计算失败: ' + e.message;
    }
}

function generatePassword() {
    const length = parseInt(document.getElementById('passwordLength').value);
    const includeUppercase = document.getElementById('includeUppercase').checked;
    const includeLowercase = document.getElementById('includeLowercase').checked;
    const includeNumbers = document.getElementById('includeNumbers').checked;
    const includeSpecial = document.getElementById('includeSpecial').checked;
    
    let charset = '';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSpecial) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    if (charset.length === 0) {
        document.getElementById('passwordResult').textContent = '请至少选择一种字符类型';
        return;
    }
    
    let password = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
        password += charset[array[i] % charset.length];
    }
    
    document.getElementById('passwordResult').textContent = password;
    document.getElementById('copyPasswordBtn').disabled = false;
}

function copyPassword() {
    const password = document.getElementById('passwordResult').textContent;
    if (!password || password.includes('请至少选择')) return;
    
    navigator.clipboard.writeText(password).then(() => {
        alert('密码已复制到剪贴板');
    }).catch(() => {
        alert('复制失败，请手动复制');
    });
}

let qrCanvas = null;

function generateQRCode() {
    const text = document.getElementById('qrInput').value.trim();
    const size = parseInt(document.getElementById('qrSize').value);
    
    if (!text) {
        alert('请输入文本或URL');
        return;
    }
    
    if (text.length > 4296) {
        alert('❌ 文本过长！\n\n二维码容量限制：\n- L级纠错（推荐）：最多约2592个字符\n- M级纠错：最多约1852个字符\n- Q级纠错：最多约1417个字符\n- H级纠错：最多约1167个字符\n\n请缩短文本内容后重试。');
        return;
    }
    
    try {
        const qrResult = document.getElementById('qrResult');
        qrResult.innerHTML = '';
        
        const qrContainer = document.createElement('div');
        qrResult.appendChild(qrContainer);
        
        const qr = new QRCode(qrContainer, {
            text: text,
            width: size,
            height: size,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L,
            typeNumber: 0
        });
        
        setTimeout(() => {
            const canvas = qrContainer.querySelector('canvas');
            if (canvas) {
                qrCanvas = canvas;
                document.getElementById('downloadQrBtn').disabled = false;
            } else {
                const img = qrContainer.querySelector('img');
                if (img) {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = size;
                    tempCanvas.height = size;
                    const ctx = tempCanvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, size, size);
                    qrCanvas = tempCanvas;
                    document.getElementById('downloadQrBtn').disabled = false;
                }
            }
        }, 100);
        
    } catch (e) {
        console.error('QR Code generation error:', e);
        alert('生成二维码失败: ' + e.message);
    }
}

function downloadQRCode() {
    if (!qrCanvas) return;
    
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = qrCanvas.toDataURL('image/png');
    link.click();
}

function initColorPicker() {
    const picker = document.getElementById('colorPicker');
    if (picker) {
        picker.addEventListener('input', updateColorInfo);
        updateColorInfo();
    }
}

function updateColorInfo() {
    const color = document.getElementById('colorPicker').value;
    document.getElementById('colorPreview').style.background = color;
    document.getElementById('hexValue').textContent = color;
    document.getElementById('rgbValue').textContent = hexToRgbStr(color);
    document.getElementById('hslValue').textContent = hexToHslStr(color);
}

function hexToRgbStr(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
    }
    return '';
}

function hexToHslStr(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        const r = parseInt(result[1], 16) / 255;
        const g = parseInt(result[2], 16) / 255;
        const b = parseInt(result[3], 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
    }
    return '';
}

function hexToRgb() {
    const hex = document.getElementById('hexInput').value;
    const result = document.getElementById('rgbResult');
    const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (match) {
        result.textContent = `rgb(${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)})`;
        result.className = 'result success';
    } else {
        result.textContent = '请输入有效的HEX颜色值，如 #ffffff';
        result.className = 'result error';
    }
}

function rgbToHex() {
    const r = parseInt(document.getElementById('rInput').value);
    const g = parseInt(document.getElementById('gInput').value);
    const b = parseInt(document.getElementById('bInput').value);
    const result = document.getElementById('hexResult');
    
    if (!isNaN(r) && !isNaN(g) && !isNaN(b) && r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        result.textContent = hex.toUpperCase();
        result.className = 'result success';
    } else {
        result.textContent = '请输入有效的RGB值 (0-255)';
        result.className = 'result error';
    }
}

function initCurrentTime() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
}

function updateCurrentTime() {
    const now = new Date();
    document.getElementById('currentDateTime').textContent = now.toLocaleString('zh-CN');
    document.getElementById('currentTimestamp').textContent = Math.floor(now.getTime() / 1000);
}

function timestampToDate() {
    const timestamp = document.getElementById('timestampInput').value;
    const result = document.getElementById('timeResult');
    if (timestamp) {
        const date = new Date(parseInt(timestamp) * 1000);
        if (!isNaN(date.getTime())) {
            result.textContent = date.toLocaleString('zh-CN');
            result.className = 'result success';
        } else {
            result.textContent = '❌ 无效的时间戳';
            result.className = 'result error';
        }
    }
}

function dateToTimestamp() {
    const dateInput = document.getElementById('dateInput').value;
    const result = document.getElementById('timeResult');
    if (dateInput) {
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
            const timestamp = Math.floor(date.getTime() / 1000);
            result.textContent = timestamp;
            result.className = 'result success';
        } else {
            result.textContent = '❌ 无效的日期';
            result.className = 'result error';
        }
    }
}

let countdownInterval = null;

function startCountdown() {
    const targetDate = new Date(document.getElementById('countdownInput').value);
    const result = document.getElementById('countdownResult');
    
    if (isNaN(targetDate.getTime())) {
        result.textContent = '❌ 请选择有效的日期时间';
        result.className = 'result error';
        return;
    }
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        const now = new Date();
        const diff = targetDate - now;
        
        if (diff <= 0) {
            result.textContent = '⏰ 倒计时结束!';
            result.className = 'result success';
            clearInterval(countdownInterval);
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        result.textContent = `${days}天 ${hours}小时 ${minutes}分 ${seconds}秒`;
        result.className = 'result success';
    }, 1000);
}

let calcExpression = '';

function calcInput(val) {
    calcExpression += val;
    document.getElementById('calcDisplay').value = calcExpression;
}

function calcClear() {
    calcExpression = '';
    document.getElementById('calcDisplay').value = '';
}

function calcEquals() {
    try {
        calcExpression = eval(calcExpression).toString();
        document.getElementById('calcDisplay').value = calcExpression;
    } catch (e) {
        document.getElementById('calcDisplay').value = 'Error';
        calcExpression = '';
    }
}

function generateRandom() {
    const min = parseInt(document.getElementById('minInput').value) || 1;
    const max = parseInt(document.getElementById('maxInput').value) || 100;
    const result = document.getElementById('randomResult');
    
    if (min <= max) {
        const random = Math.floor(Math.random() * (max - min + 1)) + min;
        result.textContent = random;
        result.className = 'result success';
    } else {
        result.textContent = '最小值不能大于最大值';
        result.className = 'result error';
    }
}

const units = {
    length: {
        name: '长度',
        units: ['米', '千米', '厘米', '毫米', '英里', '码', '英尺', '英寸'],
        factors: [1, 1000, 0.01, 0.001, 1609.344, 0.9144, 0.3048, 0.0254]
    },
    weight: {
        name: '重量',
        units: ['千克', '克', '毫克', '吨', '磅', '盎司'],
        factors: [1, 0.001, 0.000001, 1000, 0.453592, 0.0283495]
    },
    temperature: {
        name: '温度',
        units: ['摄氏度', '华氏度', '开尔文'],
        factors: []
    },
    pressure: {
        name: '压力',
        units: ['帕斯卡(Pa)', '千帕(kPa)', '兆帕(MPa)', '巴(bar)', '标准大气压(atm)', '毫米汞柱(mmHg)', '磅/平方英寸(psi)'],
        factors: [1, 1000, 1000000, 100000, 101325, 133.322, 6894.76]
    },
    flow: {
        name: '流量',
        units: ['立方米/秒(m³/s)', '立方米/分钟(m³/min)', '立方米/小时(m³/h)', '升/秒(L/s)', '升/分钟(L/min)', '升/小时(L/h)', '立方英尺/秒(ft³/s)', '加仑/分钟(gal/min)'],
        factors: [1, 1/60, 1/3600, 0.001, 0.001/60, 0.001/3600, 0.0283168, 0.00006309]
    },
    power: {
        name: '功率',
        units: ['瓦特(W)', '千瓦(kW)', '兆瓦(MW)', '马力(HP)', '千卡/小时(kcal/h)', 'BTU/小时(BTU/h)'],
        factors: [1, 1000, 1000000, 735.5, 1.163, 0.2931]
    },
    energy: {
        name: '能量',
        units: ['焦耳(J)', '千焦(kJ)', '兆焦(MJ)', '千卡(kcal)', '英热单位(BTU)', '千瓦时(kWh)'],
        factors: [1, 1000, 1000000, 4184, 1055.06, 3600000]
    },
    volume: {
        name: '体积',
        units: ['立方米(m³)', '立方分米(dm³)', '立方厘米(cm³)', '立方毫米(mm³)', '升(L)', '毫升(mL)', '立方英尺(ft³)', '加仑(gal)'],
        factors: [1, 0.001, 0.000001, 0.000000001, 0.001, 0.000001, 0.0283168, 0.00378541]
    },
    area: {
        name: '面积',
        units: ['平方米(m²)', '平方千米(km²)', '平方厘米(cm²)', '平方毫米(mm²)', '公顷(ha)', '亩', '平方英尺(ft²)', '平方英寸(in²)'],
        factors: [1, 1000000, 0.0001, 0.000001, 10000, 666.6667, 0.092903, 0.00064516]
    }
};

function initUnitConverter() {
    updateUnitOptions();
}

function updateUnitOptions() {
    const type = document.getElementById('unitType').value;
    const fromSelect = document.getElementById('unitFrom');
    const toSelect = document.getElementById('unitTo');
    
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';
    
    units[type].units.forEach((unit, index) => {
        fromSelect.innerHTML += `<option value="${index}">${unit}</option>`;
        toSelect.innerHTML += `<option value="${index}">${unit}</option>`;
    });
    
    if (units[type].units.length > 1) {
        toSelect.value = 1;
    }
}

function convertUnit() {
    const type = document.getElementById('unitType').value;
    const value = parseFloat(document.getElementById('unitFromValue').value);
    const fromIndex = parseInt(document.getElementById('unitFrom').value);
    const toIndex = parseInt(document.getElementById('unitTo').value);
    const result = document.getElementById('unitResult');
    
    if (isNaN(value)) {
        result.textContent = '请输入有效的数值';
        result.className = 'result error';
        return;
    }
    
    let convertedValue;
    
    if (type === 'temperature') {
        convertedValue = convertTemperature(value, fromIndex, toIndex);
    } else {
        const baseValue = value * units[type].factors[fromIndex];
        convertedValue = baseValue / units[type].factors[toIndex];
    }
    
    result.textContent = convertedValue;
    result.className = 'result success';
}

function convertTemperature(value, from, to) {
    let celsius;
    
    if (from === 0) celsius = value;
    else if (from === 1) celsius = (value - 32) * 5 / 9;
    else if (from === 2) celsius = value - 273.15;
    
    if (to === 0) return celsius;
    else if (to === 1) return celsius * 9 / 5 + 32;
    else if (to === 2) return celsius + 273.15;
}

const photoSizes = {
    '1inch': {
        name: '一寸照片',
        mm: { width: 25, height: 35 },
        cm: { width: 2.5, height: 3.5 },
        pixels: { width: 295, height: 413 },
        usage: '常用于简历、学生证等'
    },
    'small1inch': {
        name: '小一寸照片',
        mm: { width: 22, height: 32 },
        cm: { width: 2.2, height: 3.2 },
        pixels: { width: 260, height: 378 },
        usage: '常用于驾驶证、社保卡等'
    },
    'large1inch': {
        name: '大一寸照片',
        mm: { width: 33, height: 48 },
        cm: { width: 3.3, height: 4.8 },
        pixels: { width: 390, height: 567 },
        usage: '常用于中国护照、港澳通行证等'
    },
    '2inch': {
        name: '二寸照片',
        mm: { width: 35, height: 49 },
        cm: { width: 3.5, height: 4.9 },
        pixels: { width: 413, height: 579 },
        usage: '常用于毕业证、学位证等'
    },
    'small2inch': {
        name: '小二寸照片',
        mm: { width: 33, height: 48 },
        cm: { width: 3.3, height: 4.8 },
        pixels: { width: 390, height: 567 },
        usage: '常用于普通护照、签证等'
    },
    'passport': {
        name: '护照/签证照片',
        mm: { width: 33, height: 48 },
        cm: { width: 3.3, height: 4.8 },
        pixels: { width: 390, height: 567 },
        usage: '国际护照、各国签证等'
    },
    'idcard': {
        name: '身份证照片',
        mm: { width: 26, height: 32 },
        cm: { width: 2.6, height: 3.2 },
        pixels: { width: 358, height: 441 },
        usage: '居民身份证正反面照片'
    },
    'driving': {
        name: '驾驶证照片',
        mm: { width: 22, height: 32 },
        cm: { width: 2.2, height: 3.2 },
        pixels: { width: 260, height: 378 },
        usage: '机动车驾驶证'
    }
};

let uploadedImage = null;

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            uploadedImage = img;
            
            const preview = document.getElementById('photoPreview');
            preview.innerHTML = `<img src="${e.target.result}" alt="预览" />`;
            
            document.getElementById('originalSize').textContent = `${img.width} × ${img.height} 像素`;
            
            document.getElementById('convertBtn').disabled = false;
            
            updateTargetSizeInfo();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function updateTargetSizeInfo() {
    const selectedSize = document.getElementById('targetPhotoSize').value;
    const infoDiv = document.getElementById('targetSizeInfo');
    const size = photoSizes[selectedSize];
    
    if (!size) {
        infoDiv.textContent = '❌ 未找到该尺寸信息';
        infoDiv.className = 'result error';
        return;
    }
    
    let info = `📐 ${size.name}: ${size.mm.width}×${size.mm.height}mm (${size.cm.width}×${size.cm.height}cm)\n`;
    info += `🖼️ 像素: ${size.pixels.width}×${size.pixels.height} (300dpi)\n`;
    info += `💼 用途: ${size.usage}`;
    
    if (uploadedImage) {
        const scaleX = size.pixels.width / uploadedImage.width;
        const scaleY = size.pixels.height / uploadedImage.height;
        const avgScale = (scaleX + scaleY) / 2;
        
        info += `\n🔄 缩放比例: `;
        if (Math.abs(avgScale - 1) < 0.05) {
            info += '基本不变';
        } else if (avgScale > 1) {
            info += `放大 ${(avgScale * 100 - 100).toFixed(1)}%`;
        } else {
            info += `缩小 ${(100 - avgScale * 100).toFixed(1)}%`;
        }
    }
    
    infoDiv.textContent = info;
    infoDiv.className = 'result success';
}

function convertAndDownloadPhoto() {
    if (!uploadedImage) {
        alert('请先上传照片');
        return;
    }
    
    const selectedSize = document.getElementById('targetPhotoSize').value;
    const targetSize = photoSizes[selectedSize];
    
    if (!targetSize) {
        alert('未找到目标尺寸');
        return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = targetSize.pixels.width;
    canvas.height = targetSize.pixels.height;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const scale = Math.max(canvas.width / uploadedImage.width, canvas.height / uploadedImage.height);
    const x = (canvas.width - uploadedImage.width * scale) / 2;
    const y = (canvas.height - uploadedImage.height * scale) / 2;
    
    ctx.drawImage(uploadedImage, x, y, uploadedImage.width * scale, uploadedImage.height * scale);
    
    const link = document.createElement('a');
    link.download = `${targetSize.name}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

document.getElementById('targetPhotoSize').addEventListener('change', updateTargetSizeInfo);

const exchangeRates = {
    USD: { code: 'USD', name: '美元', rate: 1 },
    CNY: { code: 'CNY', name: '人民币', rate: 7.24 },
    EUR: { code: 'EUR', name: '欧元', rate: 0.92 },
    JPY: { code: 'JPY', name: '日元', rate: 149.5 },
    GBP: { code: 'GBP', name: '英镑', rate: 0.79 },
    KRW: { code: 'KRW', name: '韩元', rate: 1320 },
    HKD: { code: 'HKD', name: '港币', rate: 7.82 },
    AUD: { code: 'AUD', name: '澳元', rate: 1.53 },
    CAD: { code: 'CAD', name: '加元', rate: 1.36 },
    SGD: { code: 'SGD', name: '新加坡元', rate: 1.34 },
    THB: { code: 'THB', name: '泰铢', rate: 35.2 },
    MYR: { code: 'MYR', name: '马来西亚林吉特', rate: 4.48 },
    INR: { code: 'INR', name: '印度卢比', rate: 82.7 },
    BRL: { code: 'BRL', name: '巴西雷亚尔', rate: 4.98 },
    RUB: { code: 'RUB', name: '俄罗斯卢布', rate: 91.5 },
    ZAR: { code: 'ZAR', name: '南非兰特', rate: 19.2 }
};

let realtimeRates = null;
let savedRates = null;
let lastUpdateTime = null;
let updateTimer = null;

function loadSavedRates() {
    try {
        const saved = localStorage.getItem('exchangeRates');
        const savedTime = localStorage.getItem('exchangeRatesTime');
        if (saved) {
            savedRates = JSON.parse(saved);
            lastUpdateTime = savedTime ? new Date(parseInt(savedTime)) : null;
            console.log('已加载保存的汇率，更新时间:', lastUpdateTime);
        }
    } catch (e) {
        console.warn('加载保存的汇率失败:', e);
    }
}

function saveRates(rates) {
    try {
        localStorage.setItem('exchangeRates', JSON.stringify(rates));
        localStorage.setItem('exchangeRatesTime', Date.now().toString());
        savedRates = rates;
        lastUpdateTime = new Date();
        console.log('汇率已保存');
    } catch (e) {
        console.warn('保存汇率失败:', e);
    }
}

function getDisplayTime() {
    if (!lastUpdateTime) return '未知';
    const now = new Date();
    const diff = now - lastUpdateTime;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return lastUpdateTime.toLocaleDateString();
}

function initCurrencyConverter() {
    const fromSelect = document.getElementById('currencyFrom');
    const toSelect = document.getElementById('currencyTo');
    
    Object.values(exchangeRates).forEach((currency, index) => {
        fromSelect.innerHTML += `<option value="${currency.code}">${currency.name} (${currency.code})</option>`;
        toSelect.innerHTML += `<option value="${currency.code}">${currency.name} (${currency.code})</option>`;
    });
    
    fromSelect.value = 'CNY';
    toSelect.value = 'USD';
    
    loadSavedRates();
    
    fetchRealtimeRates().then(() => {
        updateRateDisplay();
    });
    
    startAutoUpdate();
}

function startAutoUpdate() {
    if (updateTimer) clearInterval(updateTimer);
    updateTimer = setInterval(() => {
        console.log('自动更新汇率...');
        fetchRealtimeRates();
    }, 5 * 60 * 1000);
}

function updateRateDisplay() {
    const fromCode = document.getElementById('currencyFrom').value;
    const toCode = document.getElementById('currencyTo').value;
    const result = document.getElementById('exchangeRate');
    
    let fromRate, toRate, rate;
    let sourceText = '';
    
    if (realtimeRates && realtimeRates[fromCode] && realtimeRates[toCode]) {
        fromRate = realtimeRates[fromCode];
        toRate = realtimeRates[toCode];
        rate = toRate / fromRate;
        sourceText = `🌐 实时汇率 (${getDisplayTime()}更新)`;
    } else if (savedRates && savedRates[fromCode] && savedRates[toCode]) {
        fromRate = savedRates[fromCode];
        toRate = savedRates[toCode];
        rate = toRate / fromRate;
        sourceText = `📊 缓存汇率 (${getDisplayTime()}更新)`;
    } else {
        fromRate = exchangeRates[fromCode].rate;
        toRate = exchangeRates[toCode].rate;
        rate = toRate / fromRate;
        sourceText = `📋 默认汇率`;
    }
    
    result.textContent = `${sourceText}: 1 ${fromCode} = ${rate.toFixed(4)} ${toCode}`;
    result.className = 'result success';
}

async function fetchRealtimeRates() {
    const apiUrl = 'https://v6.exchangerate-api.com/v6/d0a84f4c9739a3a373983c21/latest/USD';
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('获取汇率失败');
        
        const data = await response.json();
        if (data.result !== 'success') throw new Error('API返回失败');
        
        const newRates = { USD: 1 };
        Object.keys(exchangeRates).forEach(code => {
            if (data.conversion_rates[code]) {
                newRates[code] = data.conversion_rates[code];
            }
        });
        
        realtimeRates = newRates;
        saveRates(newRates);
        updateRateDisplay();
        return true;
    } catch (error) {
        console.warn('无法获取实时汇率:', error.message);
        return false;
    }
}

async function convertCurrency() {
    const amount = parseFloat(document.getElementById('currencyAmount').value);
    const fromCode = document.getElementById('currencyFrom').value;
    const toCode = document.getElementById('currencyTo').value;
    const result = document.getElementById('currencyResult');
    
    if (isNaN(amount) || amount <= 0) {
        result.textContent = '❌ 请输入有效的金额';
        result.className = 'result error';
        return;
    }
    
    result.textContent = '⏳ 正在获取汇率...';
    result.className = 'result';
    
    await fetchRealtimeRates();
    
    let fromRate, toRate;
    let sourceText = '';
    
    if (realtimeRates && realtimeRates[fromCode] && realtimeRates[toCode]) {
        fromRate = realtimeRates[fromCode];
        toRate = realtimeRates[toCode];
        sourceText = '实时汇率';
    } else if (savedRates && savedRates[fromCode] && savedRates[toCode]) {
        fromRate = savedRates[fromCode];
        toRate = savedRates[toCode];
        sourceText = `缓存汇率(${getDisplayTime()})`;
    } else {
        fromRate = exchangeRates[fromCode].rate;
        toRate = exchangeRates[toCode].rate;
        sourceText = '默认汇率';
    }
    
    const convertedAmount = (amount * toRate) / fromRate;
    const rate = toRate / fromRate;
    
    result.textContent = `${amount.toLocaleString()} ${fromCode} = ${convertedAmount.toFixed(2)} ${toCode} (${sourceText}: 1 ${fromCode} = ${rate.toFixed(4)} ${toCode})`;
    result.className = 'result success';
}


