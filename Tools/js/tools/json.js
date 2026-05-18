document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    const output = document.getElementById('output');
    
    input.addEventListener('input', () => {
        hideError();
    });

    input.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            formatJSON();
        }
    });

    const lastInput = localStorage.getItem('jsonLastInput');
    if (lastInput) {
        input.value = lastInput;
    }
});

function formatJSON() {
    try {
        const input = document.getElementById('input').value;
        
        if (!input.trim()) {
            showError('请输入JSON内容');
            return;
        }

        const cleaned = input
            .replace(/,\s*]/g, ']')
            .replace(/,\s*}/g, '}');

        const obj = JSON.parse(cleaned);
        const formatted = JSON.stringify(obj, null, 2);
        
        document.getElementById('output').value = formatted;
        localStorage.setItem('jsonLastInput', input);
        hideError();
        
        animateSuccess();
    } catch (e) {
        showError('JSON格式错误: ' + e.message);
    }
}

function compressJSON() {
    try {
        const input = document.getElementById('input').value;
        
        if (!input.trim()) {
            showError('请输入JSON内容');
            return;
        }

        const cleaned = input
            .replace(/,\s*]/g, ']')
            .replace(/,\s*}/g, '}');

        const obj = JSON.parse(cleaned);
        document.getElementById('output').value = JSON.stringify(obj);
        localStorage.setItem('jsonLastInput', input);
        hideError();
        
        animateSuccess();
    } catch (e) {
        showError('JSON格式错误: ' + e.message);
    }
}

function copyResult() {
    const output = document.getElementById('output');
    if (!output.value) {
        showError('没有可复制的内容');
        return;
    }

    output.select();
    document.execCommand('copy');
    
    const originalText = output.value;
    output.value = '✓ 已复制到剪贴板';
    setTimeout(() => {
        output.value = originalText;
    }, 2000);
}

function clearAll() {
    document.getElementById('input').value = '';
    document.getElementById('output').value = '';
    localStorage.removeItem('jsonLastInput');
    hideError();
}

function showError(message) {
    const errorDiv = document.getElementById('errorMsg');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    const errorDiv = document.getElementById('errorMsg');
    errorDiv.classList.add('hidden');
}

function animateSuccess() {
    const output = document.getElementById('output');
    output.style.background = '#ECFDF5';
    setTimeout(() => {
        output.style.background = 'transparent';
    }, 500);
}