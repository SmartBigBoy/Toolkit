let imageBase64 = '';

function encodeText() {
    const input = document.getElementById('input').value;
    
    if (!input) {
        alert('请输入文本');
        return;
    }

    try {
        const encoded = btoa(encodeURIComponent(input).replace(/%([0-9A-F]{2})/g,
            (match, p1) => String.fromCharCode('0x' + p1)));
        document.getElementById('output').value = encoded;
    } catch (e) {
        alert('编码失败: ' + e.message);
    }
}

function decodeText() {
    const input = document.getElementById('input').value;
    
    if (!input) {
        alert('请输入Base64编码');
        return;
    }

    try {
        const decoded = decodeURIComponent(atob(input).split('').map(c => 
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        document.getElementById('output').value = decoded;
    } catch (e) {
        alert('解码失败: ' + e.message);
    }
}

function copyResult() {
    const output = document.getElementById('output');
    if (!output.value) {
        alert('没有可复制的内容');
        return;
    }

    navigator.clipboard.writeText(output.value).then(() => {
        const originalText = output.value;
        output.value = '✓ 已复制到剪贴板';
        setTimeout(() => {
            output.value = originalText;
        }, 2000);
    });
}

function clearAll() {
    document.getElementById('input').value = '';
    document.getElementById('output').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('copyImageBtn').disabled = true;
    imageBase64 = '';
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        imageBase64 = e.target.result;
        
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `
            <img src="${imageBase64}" alt="预览" style="max-width: 300px; max-height: 300px;">
            <p>文件大小: ${(file.size / 1024).toFixed(2)} KB</p>
            <p>Base64长度: ${imageBase64.length} 字符</p>
        `;
        
        document.getElementById('copyImageBtn').disabled = false;
    };
    reader.readAsDataURL(file);
}

function copyBase64Image() {
    if (!imageBase64) return;
    
    navigator.clipboard.writeText(imageBase64).then(() => {
        alert('Base64图片已复制');
    });
}