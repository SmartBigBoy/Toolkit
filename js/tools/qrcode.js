let qrCanvas = null;
let qrCodeInstance = null;

function generateQRCode() {
    const text = document.getElementById('qrInput').value.trim();
    const size = parseInt(document.getElementById('qrSize').value);
    const colorDark = document.getElementById('colorDark').value;
    const colorLight = document.getElementById('colorLight').value;
    const errorLevel = document.getElementById('errorLevel').value;

    if (!text) {
        alert('请输入文本或URL');
        return;
    }

    if (text.length > 4296) {
        alert('❌ 文本过长！\n\n二维码容量限制：\n- L级纠错：最多约2592个字符\n- M级纠错：最多约1852个字符\n- Q级纠错：最多约1417个字符\n- H级纠错：最多约1167个字符\n\n请缩短文本内容后重试。');
        return;
    }

    const qrResult = document.getElementById('qrResult');
    qrResult.innerHTML = '';

    try {
        const container = document.createElement('div');
        qrResult.appendChild(container);

        let correctLevel = QRCode.CorrectLevel.L;
        switch (errorLevel) {
            case 'L': correctLevel = QRCode.CorrectLevel.L; break;
            case 'M': correctLevel = QRCode.CorrectLevel.M; break;
            case 'Q': correctLevel = QRCode.CorrectLevel.Q; break;
            case 'H': correctLevel = QRCode.CorrectLevel.H; break;
        }

        qrCodeInstance = new QRCode(container, {
            text: text,
            width: size,
            height: size,
            colorDark: colorDark,
            colorLight: colorLight,
            correctLevel: correctLevel
        });

        setTimeout(() => {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                qrCanvas = canvas;
                document.getElementById('downloadPngBtn').disabled = false;
            } else {
                const img = container.querySelector('img');
                if (img) {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = size;
                    tempCanvas.height = size;
                    const ctx = tempCanvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    qrCanvas = tempCanvas;
                    document.getElementById('downloadPngBtn').disabled = false;
                }
            }
        }, 100);
    } catch (e) {
        qrResult.innerHTML = '<div class="error">生成失败: ' + e.message + '</div>';
    }
}

function downloadQRCode(format) {
    if (qrCanvas) {
        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = qrCanvas.toDataURL('image/png');
        link.click();
    }
}