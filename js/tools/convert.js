function convertBase() {
    const input = document.getElementById('inputValue').value.trim();
    const fromBase = parseInt(document.getElementById('fromBase').value);

    if (!input) {
        alert('请输入数值');
        return;
    }

    try {
        const decimal = parseInt(input, fromBase);
        
        if (isNaN(decimal)) {
            alert('无效的输入格式');
            return;
        }

        document.getElementById('binaryResult').textContent = decimal.toString(2);
        document.getElementById('octalResult').textContent = decimal.toString(8);
        document.getElementById('decimalResult').textContent = decimal.toString(10);
        document.getElementById('hexResult').textContent = decimal.toString(16).toUpperCase();
    } catch (e) {
        alert('转换失败: ' + e.message);
    }
}

function swapBases() {
    const fromSelect = document.getElementById('fromBase');
    const toSelect = document.getElementById('toBase');
    
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
}

function copyResult(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    if (text === '---') {
        alert('请先生成转换结果');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        alert('已复制到剪贴板');
    });
}
