const units = {
    length: [
        { name: '米', symbol: 'm', factor: 1 },
        { name: '千米', symbol: 'km', factor: 1000 },
        { name: '厘米', symbol: 'cm', factor: 0.01 },
        { name: '毫米', symbol: 'mm', factor: 0.001 },
        { name: '英寸', symbol: 'in', factor: 0.0254 },
        { name: '英尺', symbol: 'ft', factor: 0.3048 },
        { name: '码', symbol: 'yd', factor: 0.9144 },
        { name: '英里', symbol: 'mi', factor: 1609.34 }
    ],
    weight: [
        { name: '千克', symbol: 'kg', factor: 1 },
        { name: '克', symbol: 'g', factor: 0.001 },
        { name: '毫克', symbol: 'mg', factor: 0.000001 },
        { name: '吨', symbol: 't', factor: 1000 },
        { name: '磅', symbol: 'lb', factor: 0.453592 },
        { name: '盎司', symbol: 'oz', factor: 0.0283495 }
    ],
    temperature: [
        { name: '摄氏度', symbol: '°C', type: 'celsius' },
        { name: '华氏度', symbol: '°F', type: 'fahrenheit' },
        { name: '开尔文', symbol: 'K', type: 'kelvin' }
    ],
    pressure: [
        { name: '帕斯卡', symbol: 'Pa', factor: 1 },
        { name: '千帕', symbol: 'kPa', factor: 1000 },
        { name: '兆帕', symbol: 'MPa', factor: 1000000 },
        { name: '巴', symbol: 'bar', factor: 100000 },
        { name: '标准大气压', symbol: 'atm', factor: 101325 },
        { name: '毫米汞柱', symbol: 'mmHg', factor: 133.322 },
        { name: '磅/平方英寸', symbol: 'psi', factor: 6894.76 }
    ],
    volume: [
        { name: '立方米', symbol: 'm³', factor: 1 },
        { name: '立方厘米', symbol: 'cm³', factor: 0.000001 },
        { name: '升', symbol: 'L', factor: 0.001 },
        { name: '毫升', symbol: 'mL', factor: 0.000001 },
        { name: '加仑（美）', symbol: 'gal', factor: 0.00378541 },
        { name: '夸脱（美）', symbol: 'qt', factor: 0.000946353 },
        { name: '品脱（美）', symbol: 'pt', factor: 0.000473176 }
    ],
    speed: [
        { name: '米/秒', symbol: 'm/s', factor: 1 },
        { name: '千米/小时', symbol: 'km/h', factor: 0.277778 },
        { name: '英里/小时', symbol: 'mph', factor: 0.44704 },
        { name: '节', symbol: 'kn', factor: 0.514444 }
    ],
    time: [
        { name: '秒', symbol: 's', factor: 1 },
        { name: '毫秒', symbol: 'ms', factor: 0.001 },
        { name: '微秒', symbol: 'μs', factor: 0.000001 },
        { name: '分钟', symbol: 'min', factor: 60 },
        { name: '小时', symbol: 'h', factor: 3600 },
        { name: '天', symbol: 'd', factor: 86400 },
        { name: '周', symbol: 'w', factor: 604800 },
        { name: '年', symbol: 'y', factor: 31536000 }
    ],
    power: [
        { name: '瓦特', symbol: 'W', factor: 1 },
        { name: '千瓦', symbol: 'kW', factor: 1000 },
        { name: '兆瓦', symbol: 'MW', factor: 1000000 },
        { name: '马力', symbol: 'HP', factor: 735.499 },
        { name: '英制马力', symbol: 'bhp', factor: 745.7 }
    ]
};

let currentResult = '';

document.addEventListener('DOMContentLoaded', () => {
    updateUnits();
});

function updateUnits() {
    const category = document.getElementById('unitCategory').value;
    const fromSelect = document.getElementById('fromUnit');
    const toSelect = document.getElementById('toUnit');

    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';

    units[category].forEach(unit => {
        const option1 = document.createElement('option');
        option1.value = unit.symbol;
        option1.textContent = `${unit.name} (${unit.symbol})`;
        fromSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = unit.symbol;
        option2.textContent = `${unit.name} (${unit.symbol})`;
        toSelect.appendChild(option2);
    });

    toSelect.selectedIndex = 1;
    document.getElementById('targetValue').value = '';
    document.getElementById('unitResult').style.display = 'none';
}

function convertUnit() {
    const category = document.getElementById('unitCategory').value;
    const value = parseFloat(document.getElementById('inputValue').value);
    const fromUnit = document.getElementById('fromUnit').value;
    const toUnit = document.getElementById('toUnit').value;

    if (isNaN(value)) {
        alert('请输入有效的数值');
        return;
    }

    let result;

    if (category === 'temperature') {
        result = convertTemperature(value, fromUnit, toUnit);
    } else {
        const fromFactor = units[category].find(u => u.symbol === fromUnit).factor;
        const toFactor = units[category].find(u => u.symbol === toUnit).factor;
        const baseValue = value * fromFactor;
        result = baseValue / toFactor;
    }

    const fromName = units[category].find(u => u.symbol === fromUnit).name;
    const toName = units[category].find(u => u.symbol === toUnit).name;
    const formattedResult = result.toFixed(10).replace(/\.?0+$/, ''); // 去除末尾多余的0
    currentResult = formattedResult;

    document.getElementById('targetValue').value = formattedResult;
    document.getElementById('resultValue').textContent = `${value} ${fromUnit} = ${formattedResult} ${toUnit}`;
    document.getElementById('unitResult').style.display = 'block';
}

function convertTemperature(value, fromUnit, toUnit) {
    let celsius;

    switch (fromUnit) {
        case '°C':
            celsius = value;
            break;
        case '°F':
            celsius = (value - 32) * 5 / 9;
            break;
        case 'K':
            celsius = value - 273.15;
            break;
    }

    let result;
    switch (toUnit) {
        case '°C':
            result = celsius;
            break;
        case '°F':
            result = celsius * 9 / 5 + 32;
            break;
        case 'K':
            result = celsius + 273.15;
            break;
    }

    return result;
}

function swapUnits() {
    const fromSelect = document.getElementById('fromUnit');
    const toSelect = document.getElementById('toUnit');
    
    const tempValue = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = tempValue;
    
    const inputValue = document.getElementById('inputValue');
    const targetValue = document.getElementById('targetValue');
    
    if (targetValue.value && targetValue.value !== '---') {
        inputValue.value = targetValue.value;
        targetValue.value = '';
        document.getElementById('unitResult').style.display = 'none';
    }
}

function copyResult() {
    navigator.clipboard.writeText(currentResult).then(() => {
        alert('已复制换算结果');
    });
}
