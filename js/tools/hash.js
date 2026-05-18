async function calculateHash() {
    const text = document.getElementById('inputText').value.trim();
    const fileInput = document.getElementById('fileInput');

    if (!text && !fileInput.files.length) {
        alert('请输入文本或上传文件');
        return;
    }

    let data;

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        data = await file.arrayBuffer();
    } else {
        const encoder = new TextEncoder();
        data = encoder.encode(text);
    }

    try {
        const md5 = await hashData(data, 'MD5');
        const sha1 = await hashData(data, 'SHA-1');
        const sha256 = await hashData(data, 'SHA-256');

        document.getElementById('md5Result').textContent = md5;
        document.getElementById('sha1Result').textContent = sha1;
        document.getElementById('sha256Result').textContent = sha256;
    } catch (e) {
        alert('计算失败: ' + e.message);
    }
}

async function hashData(data, algorithm) {
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('inputText').value = '';
    }
}

function copyResult(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    if (text === '---') {
        alert('请先计算哈希值');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        alert('已复制到剪贴板');
    });
}
