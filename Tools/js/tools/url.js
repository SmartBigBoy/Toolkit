function encodeUrl() {
    const input = document.getElementById('input').value;
    
    if (!input) {
        alert('请输入内容');
        return;
    }

    try {
        const encoded = encodeURIComponent(input);
        document.getElementById('output').value = encoded;
    } catch (e) {
        alert('编码失败: ' + e.message);
    }
}

function decodeUrl() {
    const input = document.getElementById('input').value;
    
    if (!input) {
        alert('请输入内容');
        return;
    }

    try {
        const decoded = decodeURIComponent(input);
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
}