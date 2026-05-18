let generatedPassword = '';

function updateLengthDisplay() {
    const length = document.getElementById('passwordLength').value;
    document.getElementById('lengthValue').textContent = length;
}

function generatePassword() {
    const length = parseInt(document.getElementById('passwordLength').value);
    const includeUppercase = document.getElementById('includeUppercase').checked;
    const includeLowercase = document.getElementById('includeLowercase').checked;
    const includeNumbers = document.getElementById('includeNumbers').checked;
    const includeSymbols = document.getElementById('includeSymbols').checked;

    if (length < 4 || length > 128) {
        alert('密码长度必须在4-128之间');
        return;
    }

    if (!includeUppercase && !includeLowercase && !includeNumbers && !includeSymbols) {
        alert('请至少选择一种字符类型');
        return;
    }

    let charset = '';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let password = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
        password += charset[array[i] % charset.length];
    }

    generatedPassword = password;
    document.getElementById('passwordResult').textContent = password;
    document.getElementById('copyPasswordBtn').disabled = false;
}

function copyPassword() {
    if (!generatedPassword) return;

    navigator.clipboard.writeText(generatedPassword).then(() => {
        const result = document.getElementById('passwordResult');
        const originalText = result.textContent;
        result.textContent = '✓ 已复制到剪贴板';
        setTimeout(() => {
            result.textContent = originalText;
        }, 2000);
    });
}
