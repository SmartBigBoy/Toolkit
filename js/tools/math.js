let currentBasicResult = '';
let currentTrigResult = '';

function calculate() {
    const num1 = parseFloat(document.getElementById('num1').value);
    const num2 = parseFloat(document.getElementById('num2').value);
    const operation = document.getElementById('operation').value;

    if (isNaN(num1) || isNaN(num2)) {
        alert('请输入有效的数字');
        return;
    }

    let result;
    let opSymbol;

    switch (operation) {
        case 'add':
            result = num1 + num2;
            opSymbol = '+';
            break;
        case 'subtract':
            result = num1 - num2;
            opSymbol = '-';
            break;
        case 'multiply':
            result = num1 * num2;
            opSymbol = '×';
            break;
        case 'divide':
            if (num2 === 0) {
                alert('除数不能为零');
                return;
            }
            result = num1 / num2;
            opSymbol = '÷';
            break;
        case 'pow':
            result = Math.pow(num1, num2);
            opSymbol = '^';
            break;
        case 'mod':
            result = num1 % num2;
            opSymbol = '%';
            break;
    }

    currentBasicResult = result.toString();
    document.getElementById('basicResultValue').textContent = `${num1} ${opSymbol} ${num2} = ${result}`;
    document.getElementById('basicResult').style.display = 'block';
}

function calculateTrig() {
    const angle = parseFloat(document.getElementById('angle').value);
    const type = document.getElementById('trigType').value;

    if (isNaN(angle)) {
        alert('请输入有效的角度');
        return;
    }

    const radian = angle * Math.PI / 180;
    let result;

    switch (type) {
        case 'sin':
            result = Math.sin(radian);
            break;
        case 'cos':
            result = Math.cos(radian);
            break;
        case 'tan':
            result = Math.tan(radian);
            break;
        case 'asin':
            result = Math.asin(angle) * 180 / Math.PI;
            break;
        case 'acos':
            result = Math.acos(angle) * 180 / Math.PI;
            break;
        case 'atan':
            result = Math.atan(angle) * 180 / Math.PI;
            break;
    }

    const formattedResult = result.toFixed(6);
    currentTrigResult = formattedResult;
    document.getElementById('trigResultValue').textContent = `${type}(${angle}°) = ${formattedResult}`;
    document.getElementById('trigResult').style.display = 'block';
}

function calculateAdvanced() {
    const num = parseFloat(document.getElementById('calcNum').value);

    if (isNaN(num)) {
        alert('请输入有效的数字');
        return;
    }

    document.getElementById('sqrtResult').textContent = Math.sqrt(num).toFixed(6);
    document.getElementById('cbrtResult').textContent = Math.cbrt(num).toFixed(6);
    document.getElementById('absResult').textContent = Math.abs(num);
    document.getElementById('logResult').textContent = Math.log(num).toFixed(6);
    document.getElementById('log10Result').textContent = Math.log10(num).toFixed(6);
    document.getElementById('expResult').textContent = Math.exp(num).toFixed(6);
}

function copyBasicResult() {
    navigator.clipboard.writeText(currentBasicResult).then(() => {
        alert('已复制结果');
    });
}

function copyTrigResult() {
    navigator.clipboard.writeText(currentTrigResult).then(() => {
        alert('已复制结果');
    });
}
