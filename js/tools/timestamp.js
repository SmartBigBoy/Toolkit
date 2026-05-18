document.addEventListener('DOMContentLoaded', () => {
    updateCurrentTimestamp();
    setInterval(updateCurrentTimestamp, 1000);

    const now = new Date();
    document.getElementById('year').value = now.getFullYear();
    document.getElementById('month').value = now.getMonth() + 1;
    document.getElementById('day').value = now.getDate();
    document.getElementById('hour').value = now.getHours();
    document.getElementById('minute').value = now.getMinutes();
    document.getElementById('second').value = now.getSeconds();
});

function updateCurrentTimestamp() {
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    document.getElementById('currentSeconds').innerHTML = `秒: <strong>${seconds}</strong>`;
    document.getElementById('currentMillis').innerHTML = `毫秒: <strong>${now}</strong>`;
}

function timestampToDate() {
    const timestamp = document.getElementById('timestampInput').value;
    
    if (!timestamp) {
        alert('请输入时间戳');
        return;
    }

    const ts = parseInt(timestamp);
    const isSeconds = ts < 10000000000;
    const date = new Date(isSeconds ? ts * 1000 : ts);

    const result = `完整日期: ${date.toLocaleString('zh-CN')}
日期: ${date.toLocaleDateString('zh-CN')}
时间: ${date.toLocaleTimeString('zh-CN')}
ISO格式: ${date.toISOString()}
年: ${date.getFullYear()} | 月: ${date.getMonth() + 1} | 日: ${date.getDate()}
时: ${date.getHours()} | 分: ${date.getMinutes()} | 秒: ${date.getSeconds()}
星期: ${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
时间戳类型: ${isSeconds ? '秒' : '毫秒'}`;

    document.getElementById('dateResultValue').textContent = result;
    document.getElementById('dateResult').style.display = 'block';
}

function dateToTimestamp() {
    const year = parseInt(document.getElementById('year').value);
    const month = parseInt(document.getElementById('month').value) - 1;
    const day = parseInt(document.getElementById('day').value);
    const hour = parseInt(document.getElementById('hour').value) || 0;
    const minute = parseInt(document.getElementById('minute').value) || 0;
    const second = parseInt(document.getElementById('second').value) || 0;

    const timestamp = new Date(year, month, day, hour, minute, second).getTime();
    const seconds = Math.floor(timestamp / 1000);

    document.getElementById('secondsResult').textContent = `秒: ${seconds}`;
    document.getElementById('millisResult').textContent = `毫秒: ${timestamp}`;
    document.getElementById('timestampResult').style.display = 'block';
}

function copyCurrentSeconds() {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    navigator.clipboard.writeText(timestamp).then(() => {
        alert('已复制秒时间戳');
    });
}

function copyCurrentMillis() {
    const timestamp = Date.now().toString();
    navigator.clipboard.writeText(timestamp).then(() => {
        alert('已复制毫秒时间戳');
    });
}

function copyResult(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text.trim()).then(() => {
        alert('已复制到剪贴板');
    });
}