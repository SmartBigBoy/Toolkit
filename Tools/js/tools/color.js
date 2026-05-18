document.addEventListener('DOMContentLoaded', () => {
    updateFromPicker();
});

function updateFromPicker() {
    const hex = document.getElementById('colorPicker').value;
    document.getElementById('hexInput').value = hex;
    convertFromHex();
}

function convertFromHex() {
    const hex = document.getElementById('hexInput').value.trim();
    
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
        return;
    }

    try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        const rgb = `rgb(${r}, ${g}, ${b})`;
        const hsl = rgbToHsl(r, g, b);

        document.getElementById('rgbInput').value = rgb;
        document.getElementById('hslInput').value = hsl;
        updatePreview(hex);
    } catch (e) {
        console.error('HEX转换失败:', e);
    }
}

function convertFromRgb() {
    const rgb = document.getElementById('rgbInput').value.trim();
    const match = rgb.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);

    if (!match) return;

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);

    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return;

    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);

    document.getElementById('hexInput').value = hex;
    document.getElementById('colorPicker').value = hex;
    document.getElementById('hslInput').value = hsl;
    updatePreview(hex);
}

function convertFromHsl() {
    const hsl = document.getElementById('hslInput').value.trim();
    const match = hsl.match(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i);

    if (!match) return;

    const h = parseInt(match[1]);
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    const rgb = hslToRgb(h, s, l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

    document.getElementById('hexInput').value = hex;
    document.getElementById('colorPicker').value = hex;
    document.getElementById('rgbInput').value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    updatePreview(hex);
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h / 360 + 1/3);
        g = hue2rgb(p, q, h / 360);
        b = hue2rgb(p, q, h / 360 - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function updatePreview(color) {
    const preview = document.getElementById('colorPreview');
    preview.innerHTML = `<div class="color-box" style="background: ${color};"></div>`;
}

function copyHex() {
    copyToClipboard(document.getElementById('hexInput').value);
}

function copyRgb() {
    copyToClipboard(document.getElementById('rgbInput').value);
}

function copyHsl() {
    copyToClipboard(document.getElementById('hslInput').value);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert(`已复制: ${text}`);
    });
}