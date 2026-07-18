document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    input.addEventListener('input', updateStats);
});

function updateStats() {
    const text = document.getElementById('input').value;
    document.getElementById('charCount').textContent = text.length;
    document.getElementById('wordCount').textContent = text.split(/\s+/).filter(w => w).length;
    document.getElementById('lineCount').textContent = text.split('\n').length;
}

function toUpperCase() {
    const input = document.getElementById('input').value;
    document.getElementById('output').value = input.toUpperCase();
}

function toLowerCase() {
    const input = document.getElementById('input').value;
    document.getElementById('output').value = input.toLowerCase();
}

function toTitleCase() {
    const input = document.getElementById('input').value;
    const result = input.replace(/\b\w/g, char => char.toUpperCase());
    document.getElementById('output').value = result;
}

function trimWhitespace() {
    const input = document.getElementById('input').value;
    const result = input.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
    document.getElementById('output').value = result;
}

function removeDuplicateLines() {
    const input = document.getElementById('input').value;
    const lines = input.split('\n').filter(line => line.trim());
    const unique = [...new Set(lines)];
    document.getElementById('output').value = unique.join('\n');
}

function reverseText() {
    const input = document.getElementById('input').value;
    document.getElementById('output').value = input.split('').reverse().join('');
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
    updateStats();
}