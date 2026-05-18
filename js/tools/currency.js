const currencies = [
    { code: 'CNY', name: '人民币', symbol: '¥' },
    { code: 'USD', name: '美元', symbol: '$' },
    { code: 'EUR', name: '欧元', symbol: '€' },
    { code: 'GBP', name: '英镑', symbol: '£' },
    { code: 'JPY', name: '日元', symbol: '¥' },
    { code: 'KRW', name: '韩元', symbol: '₩' },
    { code: 'HKD', name: '港币', symbol: 'HK$' },
    { code: 'AUD', name: '澳元', symbol: 'A$' },
    { code: 'CAD', name: '加元', symbol: 'C$' },
    { code: 'SGD', name: '新加坡元', symbol: 'S$' },
    { code: 'THB', name: '泰铢', symbol: '฿' },
    { code: 'MYR', name: '马来西亚林吉特', symbol: 'RM' }
];

let exchangeRates = {};
let lastUpdateTime = null;
let currentResult = '';

document.addEventListener('DOMContentLoaded', () => {
    const fromSelect = document.getElementById('fromCurrency');
    const toSelect = document.getElementById('toCurrency');

    currencies.forEach(currency => {
        const option1 = document.createElement('option');
        option1.value = currency.code;
        option1.textContent = `${currency.name} (${currency.code})`;
        fromSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = currency.code;
        option2.textContent = `${currency.name} (${currency.code})`;
        toSelect.appendChild(option2);
    });

    fromSelect.value = 'CNY';
    toSelect.value = 'USD';

    loadRates();

    setInterval(updateRates, 5 * 60 * 1000);
});

function loadRates() {
    const savedRates = localStorage.getItem('exchangeRates');
    const savedTime = localStorage.getItem('exchangeRatesTime');

    if (savedRates && savedTime) {
        exchangeRates = JSON.parse(savedRates);
        lastUpdateTime = parseInt(savedTime);
    }

    updateRates();
}

function updateRates() {
    fetch('https://api.exchangerate-api.com/v4/latest/CNY')
        .then(response => response.json())
        .then(data => {
            if (data.rates) {
                exchangeRates = data.rates;
                lastUpdateTime = Date.now();
                localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
                localStorage.setItem('exchangeRatesTime', lastUpdateTime.toString());
            }
        })
        .catch(() => {
            console.log('无法获取实时汇率，使用缓存数据');
        });
}

function convertCurrency() {
    const amount = parseFloat(document.getElementById('amount').value);
    const from = document.getElementById('fromCurrency').value;
    const to = document.getElementById('toCurrency').value;

    if (isNaN(amount)) {
        alert('请输入有效的金额');
        return;
    }

    if (!exchangeRates[from] || !exchangeRates[to]) {
        alert('无法获取汇率数据');
        return;
    }

    const rate = exchangeRates[to] / exchangeRates[from];
    const result = amount * rate;
    currentResult = result.toFixed(4);

    const fromCurrency = currencies.find(c => c.code === from);
    const toCurrency = currencies.find(c => c.code === to);
    const timeStr = lastUpdateTime ? new Date(lastUpdateTime).toLocaleString('zh-CN') : '未知';

    document.getElementById('targetAmount').value = currentResult;
    document.getElementById('resultValue').textContent = `${amount} ${fromCurrency.symbol} = ${currentResult} ${toCurrency.symbol}`;
    document.getElementById('rateInfo').textContent = `汇率: 1 ${from} = ${rate.toFixed(4)} ${to} (更新于 ${timeStr})`;
    document.getElementById('currencyResult').style.display = 'block';
}

function swapCurrencies() {
    const fromSelect = document.getElementById('fromCurrency');
    const toSelect = document.getElementById('toCurrency');
    
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
    
    const amountInput = document.getElementById('amount');
    const targetInput = document.getElementById('targetAmount');
    
    if (targetInput.value && targetInput.value !== '---') {
        amountInput.value = targetInput.value;
        targetInput.value = '';
        document.getElementById('currencyResult').style.display = 'none';
    }
}

function copyResult() {
    navigator.clipboard.writeText(currentResult).then(() => {
        alert('已复制换算结果');
    });
}
