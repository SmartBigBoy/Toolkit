/**
 * 证件照转换 - 尺寸裁剪 + 换底色（纯前端 Canvas）
 */
(function () {
  'use strict';

  const DPI = 300;
  const MM_PER_INCH = 25.4;

  const SIZES = {
    '1inch': { label: '一寸照片', mm: [25, 35], px: [295, 413] },
    'small-1inch': { label: '小一寸', mm: [22, 32], px: [260, 378] },
    'large-1inch': { label: '大一寸', mm: [33, 48], px: [390, 567] },
    '2inch': { label: '二寸照片', mm: [35, 49], px: [413, 579] },
    'small-2inch': { label: '小二寸', mm: [33, 48], px: [390, 567] },
    'id-card': { label: '身份证', mm: [26, 32], px: [358, 441] },
    passport: { label: '护照/签证', mm: [33, 48], px: [390, 567] },
    small1inch: { label: '小一寸', mm: [22, 32], px: [260, 378] },
    large1inch: { label: '大一寸', mm: [33, 48], px: [390, 567] },
    small2inch: { label: '小二寸', mm: [33, 48], px: [390, 567] },
    idcard: { label: '身份证', mm: [26, 32], px: [358, 441] },
  };

  const BACKGROUNDS = {
    original: null,
    white: '#ffffff',
    blue: '#438edb',
    red: '#d81e06',
    green: '#00b140',
    yellow: '#fadb14',
    gray: '#9e9e9e',
  };

  const state = {
    sourceImage: null,
    sourceBlob: null,
    selectedSize: '1inch',
    selectedBg: 'original',
    tolerance: 15,
    headOffset: 12,
    zoom: 100,
    edgeRefine: 72,
    aiProc: null,
    processing: false,
    resultUrl: null,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /** @type {Record<string, HTMLElement|null>} */
  const els = {};

  let previewObjectUrl = null;

  function pick(...selectors) {
    for (const sel of selectors) {
      const el = $(sel);
      if (el) return el;
    }
    return null;
  }

  function resolveElements() {
    els.fileInput = pick('#photoFile', '#photoUpload', 'input[type="file"]');
    els.dropZone = pick('#dropZone', '#uploadArea', '.drop-zone', '.photo-upload');
    els.selectBtn = pick('#selectBtn', 'label[for="photoFile"]', 'label[for="photoUpload"]', '.upload-btn');
    els.previewOriginal = pick('#previewOriginal', '#photoPreview img');
    els.previewResult = pick('#previewResult', '#resultPreview img');
    els.previewPlaceholder = pick('#previewPlaceholder');
    els.resultPlaceholder = pick('#resultPlaceholder');
    els.previewContainer = pick('#photoPreview', '.preview-box');
    els.sizeGrid = pick('#sizeGrid');
    els.bgGrid = pick('#bgGrid');
    els.convertBtn = pick('#convertBtn', '#convertBtn');
    els.downloadBtn = pick('#downloadBtn');
    els.resetBtn = pick('#resetBtn');
    els.tolerance = pick('#tolerance');
    els.toleranceVal = pick('#toleranceVal');
    els.headOffset = pick('#headOffset');
    els.headOffsetVal = pick('#headOffsetVal');
    els.zoom = pick('#zoom');
    els.zoomVal = pick('#zoomVal');
    els.edgeRefine = pick('#edgeRefine');
    els.edgeRefineVal = pick('#edgeRefineVal');
    els.edgeRefineRow = pick('#edgeRefineRow');
    els.modeRadios = $$('input[name="bgMode"]');
    els.status = pick('#statusText', '#conversionStatus');
    els.loading = pick('#loadingOverlay');
    els.resultMeta = pick('#resultMeta');
  }

  function normalizeSizeKey(key) {
    if (!key) return '1inch';
    if (SIZES[key]) return key;
    const map = {
      small1inch: 'small-1inch',
      large1inch: 'large-1inch',
      small2inch: 'small-2inch',
      idcard: 'id-card',
    };
    return map[key] || key;
  }

  function setStatus(msg, type) {
    if (!els.status) return;
    els.status.textContent = msg;
    els.status.className = (els.status.className.split(' ').filter((c) => !c.startsWith('is-')).join(' ') + (type ? ' is-' + type : '')).trim();
    if (els.status.id === 'conversionStatus' || !els.status.classList.contains('photo-status')) {
      els.status.classList.add('photo-status');
    }
  }

  function showLoading(show, text) {
    if (!els.loading) return;
    els.loading.hidden = !show;
    const t = els.loading.querySelector('.loading-text');
    if (t && text) t.textContent = text;
  }

  function revokeResultUrl() {
    if (state.resultUrl) {
      URL.revokeObjectURL(state.resultUrl);
      state.resultUrl = null;
    }
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = url;
    });
  }

  function readFileAsImage(file) {
    if (!file) return Promise.reject(new Error('未选择文件'));
    const type = (file.type || '').toLowerCase();
    if (!/^image\/(jpeg|png|webp|jpg)$/.test(type) && !/\.(jpe?g|png|webp)$/i.test(file.name || '')) {
      return Promise.reject(new Error('请上传 JPG、PNG 或 WebP 图片'));
    }
    if (file.size > 15 * 1024 * 1024) {
      return Promise.reject(new Error('图片不能超过 15MB'));
    }
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = URL.createObjectURL(file);
    return loadImageFromUrl(previewObjectUrl);
  }

  function showOriginalPreview(img) {
    if (els.previewOriginal) {
      els.previewPlaceholder && (els.previewPlaceholder.hidden = true);
      els.previewOriginal.hidden = false;
      els.previewOriginal.src = previewObjectUrl;
      return;
    }
    if (els.previewContainer) {
      els.previewContainer.innerHTML = `<img src="${previewObjectUrl}" alt="原图" style="max-width:100%;max-height:320px;border-radius:10px">`;
    }
  }

  function showResultPreview(url, meta) {
    if (els.previewResult) {
      els.resultPlaceholder && (els.resultPlaceholder.hidden = true);
      els.previewResult.hidden = false;
      els.previewResult.src = url;
    } else {
      const box = pick('#resultBox', '#resultPreview');
      if (box) {
        box.style.display = 'block';
        box.innerHTML = `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">${meta || ''}</p><img src="${url}" alt="结果" style="max-width:100%;border-radius:10px">`;
      }
    }
    if (els.resultMeta && meta) els.resultMeta.textContent = meta;
  }

  async function handleFile(file) {
    try {
      setStatus('正在加载图片…');
      const img = await readFileAsImage(file);
      state.sourceImage = img;
      state.sourceBlob = file;
      state.aiProc = null;
      revokeResultUrl();

      showOriginalPreview(img);

      if (els.convertBtn) els.convertBtn.disabled = false;
      if (els.downloadBtn) els.downloadBtn.disabled = true;
      if (els.previewResult) {
        els.previewResult.hidden = true;
        els.resultPlaceholder && (els.resultPlaceholder.hidden = false);
      }
      if (els.resultMeta) els.resultMeta.textContent = '';

      setStatus('已加载，可调整参数后点击「生成证件照」', 'success');
      schedulePreview();
    } catch (e) {
      setStatus(e.message || '加载失败', 'error');
    }
  }

  function onFileInputChange(e) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function getBgMode() {
    const checked = document.querySelector('input[name="bgMode"]:checked');
    return checked ? checked.value : 'auto';
  }

  function sampleBackgroundColor(data, w, h) {
    const samples = [];
    const band = Math.max(2, Math.floor(Math.min(w, h) * 0.04));

    function sampleRect(x0, y0, x1, y1) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          samples.push([data[i], data[i + 1], data[i + 2]]);
        }
      }
    }

    sampleRect(0, 0, w, band);
    sampleRect(0, h - band, w, h);
    sampleRect(0, 0, band, h);
    sampleRect(w - band, 0, w, h);

    const avg = [0, 0, 0];
    for (const s of samples) {
      avg[0] += s[0];
      avg[1] += s[1];
      avg[2] += s[2];
    }
    const n = samples.length || 1;
    return { r: avg[0] / n, g: avg[1] / n, b: avg[2] / n };
  }

  function colorDist(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + 0.75 * dg * dg + 0.5 * db * db);
  }

  function buildBackgroundMask(imageData, tolerance) {
    const { width: w, height: h, data } = imageData;
    const bg = sampleBackgroundColor(data, w, h);
    const isBg = new Uint8Array(w * h);
    const visited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0;
    let tail = 0;

    function tryPush(x, y) {
      const idx = y * w + x;
      if (visited[idx]) return;
      const i = idx * 4;
      const d = colorDist(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b);
      if (d > tolerance) return;
      visited[idx] = 1;
      isBg[idx] = 1;
      queue[tail++] = idx;
    }

    for (let x = 0; x < w; x++) {
      tryPush(x, 0);
      tryPush(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      tryPush(0, y);
      tryPush(w - 1, y);
    }

    const dx = [1, -1, 0, 0];
    const dy = [0, 0, 1, -1];

    while (head < tail) {
      const idx = queue[head++];
      const x = idx % w;
      const y = (idx / w) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + dx[k];
        const ny = y + dy[k];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        tryPush(nx, ny);
      }
    }

    return { isBg };
  }

  function featherAlpha(alpha, w, h, radius) {
    if (radius < 1) return alpha;
    const out = new Float32Array(alpha.length);
    const r = radius;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            sum += alpha[ny * w + nx];
            count++;
          }
        }
        out[y * w + x] = sum / count;
      }
    }
    return out;
  }


  /**
   * ========================================
   * 增强版抠图算法 v3 - 基于连通区域分析
   * 策略：先洪水填充背景，再用连通区域分析保护前景
   * ========================================
   */

  /**
   * 查找连通区域
   */
  function findConnectedComponents(mask, w, h) {
    const visited = new Uint8Array(mask.length);
    const components = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (mask[idx] && !visited[idx]) {
          const pixels = [];
          const queue = [idx];
          visited[idx] = 1;
          let head = 0;

          while (head < queue.length) {
            const p = queue[head++];
            pixels.push(p);
            const px = p % w, py = (p / w) | 0;

            if (py > 0 && mask[(py - 1) * w + px] && !visited[(py - 1) * w + px]) {
              visited[(py - 1) * w + px] = 1;
              queue.push((py - 1) * w + px);
            }
            if (py < h - 1 && mask[(py + 1) * w + px] && !visited[(py + 1) * w + px]) {
              visited[(py + 1) * w + px] = 1;
              queue.push((py + 1) * w + px);
            }
            if (px > 0 && mask[py * w + px - 1] && !visited[py * w + px - 1]) {
              visited[py * w + px - 1] = 1;
              queue.push(py * w + px - 1);
            }
            if (px < w - 1 && mask[py * w + px + 1] && !visited[py * w + px + 1]) {
              visited[py * w + px + 1] = 1;
              queue.push(py * w + px + 1);
            }
          }

          if (pixels.length > 0) {
            let minX = w, maxX = 0, minY = h, maxY = 0;
            let sumX = 0, sumY = 0;
            for (const p of pixels) {
              const px = p % w, py = (p / w) | 0;
              minX = Math.min(minX, px);
              maxX = Math.max(maxX, px);
              minY = Math.min(minY, py);
              maxY = Math.max(maxY, py);
              sumX += px;
              sumY += py;
            }
            components.push({
              pixels,
              count: pixels.length,
              bounds: { minX, maxX, minY, maxY },
              center: { x: sumX / pixels.length, y: sumY / pixels.length }
            });
          }
        }
      }
    }

    return components;
  }

  /**
   * 形态学膨胀
   */
  function dilate(mask, w, h, radius) {
    const out = new Uint8Array(w * h);
    const r2 = radius * radius;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > r2) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ny * w + nx]) {
              out[y * w + x] = 1;
              break;
            }
          }
          if (out[y * w + x]) break;
        }
      }
    }
    return out;
  }

  /**
   * 形态学腐蚀
   */
  function erode(mask, w, h, radius) {
    const out = new Uint8Array(w * h);
    const r2 = radius * radius;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let ok = true;
        for (let dy = -radius; dy <= radius && ok; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > r2) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h || !mask[ny * w + nx]) {
              ok = false;
              break;
            }
          }
        }
        out[y * w + x] = ok ? 1 : 0;
      }
    }
    return out;
  }

  /**
   * 闭运算：先膨胀后腐蚀
   */
  function morphologicalClose(mask, w, h, radius) {
    const dilated = dilate(mask, w, h, radius);
    return erode(dilated, w, h, radius);
  }

  /**
   * RGB 转 LAB 色彩空间
   */
  function rgbToLab(r, g, b) {
    let rr = r / 255, gg = g / 255, bb = b / 255;
    rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
    gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
    bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
    const x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 0.95047;
    const y = (rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750);
    const z = (rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041) / 1.08883;
    const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
    return { l: (116 * fy) - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
  }

  /**
   * LAB 色彩空间距离
   */
  function colorDistLab(r1, g1, b1, r2, g2, b2) {
    const lab1 = rgbToLab(r1, g1, b1);
    const lab2 = rgbToLab(r2, g2, b2);
    return Math.sqrt(
      (lab1.l - lab2.l) ** 2 +
      (lab1.a - lab2.a) ** 2 +
      (lab1.b - lab2.b) ** 2
    );
  }

  /**
   * 高斯模糊 Float32Array
   */
  function gaussianBlurFloat(data, w, h, radius) {
    if (radius < 1) return data;
    const out = new Float32Array(data.length);
    const kernel = [];
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const v = Math.exp(-(i * i) / (2 * radius * radius / 9));
      kernel.push(v);
      sum += v;
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
    const kHalf = radius;

    const temp = new Float32Array(data.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = 0, wsum = 0;
        for (let k = -kHalf; k <= kHalf; k++) {
          const nx = Math.min(w - 1, Math.max(0, x + k));
          val += data[y * w + nx] * kernel[k + kHalf];
          wsum += kernel[k + kHalf];
        }
        temp[y * w + x] = val / wsum;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = 0, wsum = 0;
        for (let k = -kHalf; k <= kHalf; k++) {
          const ny = Math.min(h - 1, Math.max(0, y + k));
          val += temp[ny * w + x] * kernel[k + kHalf];
          wsum += kernel[k + kHalf];
        }
        out[y * w + x] = val / wsum;
      }
    }
    return out;
  }

  /**
   * ========================================
   * 增强版抠图主函数 v3
   * ========================================
   */
  function removeBackgroundCanvasV2(img, tolerance) {
    const maxSide = 1400;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    sw = Math.round(sw * scale);
    sh = Math.round(sh * scale);

    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, sw, sh);
    const imageData = ctx.getImageData(0, 0, sw, sh);
    const { data } = imageData;

    // 步骤1: 智能采样背景色（边缘区域）
    const band = Math.max(3, Math.floor(Math.min(sw, sh) * 0.05));
    const samples = [];
    for (let x = 0; x < sw; x++) {
      for (let b = 0; b < band; b++) {
        const i = ((b + 1) * sw + x) * 4;
        samples.push([data[i], data[i+1], data[i+2]]);
        const i2 = ((sh - 2 - b) * sw + x) * 4;
        samples.push([data[i2], data[i2+1], data[i2+2]]);
      }
    }
    for (let y = 0; y < sh; y++) {
      for (let b = 0; b < band; b++) {
        const i = (y * sw + b + 1) * 4;
        samples.push([data[i], data[i+1], data[i+2]]);
        const i2 = (y * sw + sw - 2 - b) * 4;
        samples.push([data[i2], data[i2+1], data[i2+2]]);
      }
    }

    // 中位数采样（抗噪声）
    const sortedR = samples.map(s => s[0]).sort((a, b) => a - b);
    const sortedG = samples.map(s => s[1]).sort((a, b) => a - b);
    const sortedB = samples.map(s => s[2]).sort((a, b) => a - b);
    const mid = Math.floor(samples.length / 2);
    const bgColor = { r: sortedR[mid], g: sortedG[mid], b: sortedB[mid] };

    // 步骤2: LAB 色彩空间的洪水填充获取背景
    const isBg = new Uint8Array(sw * sh);
    const visited = new Uint8Array(sw * sh);
    const queue = new Int32Array(sw * sh);
    let head = 0, tail = 0;

    const tryPush = (x, y) => {
      if (x < 0 || x >= sw || y < 0 || y >= sh || visited[y * sw + x]) return;
      const i = (y * sw + x) * 4;
      const dist = colorDistLab(data[i], data[i+1], data[i+2], bgColor.r, bgColor.g, bgColor.b);
      if (dist <= tolerance) {
        visited[y * sw + x] = 1;
        isBg[y * sw + x] = 1;
        queue[tail++] = y * sw + x;
      }
    };

    // 边缘种子
    for (let x = 0; x < sw; x++) {
      tryPush(x, 0);
      tryPush(x, sh - 1);
    }
    for (let y = 0; y < sh; y++) {
      tryPush(0, y);
      tryPush(sw - 1, y);
    }

    // BFS
    while (head < tail) {
      const idx = queue[head++];
      const x = idx % sw, y = (idx / sw) | 0;
      tryPush(x + 1, y);
      tryPush(x - 1, y);
      tryPush(x, y + 1);
      tryPush(x, y - 1);
    }

    // 步骤3: 查找所有连通区域
    const components = findConnectedComponents(isBg, sw, sh);

    // 找出主要背景区域（接触边缘且面积较大）
    let mainBg = new Uint8Array(sw * sh);
    for (const comp of components) {
      const { bounds, count } = comp;
      const touchesEdge = bounds.minX === 0 || bounds.maxX === sw - 1 ||
                          bounds.minY === 0 || bounds.maxY === sh - 1;
      if (touchesEdge && count > sw * sh * 0.08) {
        for (const p of comp.pixels) mainBg[p] = 1;
      }
    }

    // 步骤4: 闭运算平滑
    mainBg = morphologicalClose(mainBg, sw, sh, 3);

    // 步骤5: 构建 alpha 通道并羽化
    const alpha = new Float32Array(sw * sh);
    for (let i = 0; i < sw * sh; i++) {
      alpha[i] = mainBg[i] ? 0 : 255;
    }

    const feathered = gaussianBlurFloat(alpha, sw, sh, 2);

    // 构建输出
    const out = ctx.createImageData(sw, sh);
    for (let i = 0; i < sw * sh; i++) {
      const si = i * 4;
      out.data[si] = data[si];
      out.data[si + 1] = data[si + 1];
      out.data[si + 2] = data[si + 2];
      out.data[si + 3] = Math.round(Math.min(255, Math.max(0, feathered[i])));
    }
    ctx.putImageData(out, 0, 0);
    return c;
  }

  /**
   * 原始简单版抠图（备选）
   */
  function removeBackgroundCanvasSimple(img, tolerance) {
    const maxSide = 1200;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    sw = Math.round(sw * scale);
    sh = Math.round(sh * scale);

    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, sw, sh);
    const imageData = ctx.getImageData(0, 0, sw, sh);
    const { isBg } = buildBackgroundMask(imageData, tolerance);

    const alpha = new Float32Array(sw * sh);
    for (let i = 0; i < isBg.length; i++) {
      alpha[i] = isBg[i] ? 0 : 255;
    }
    const smooth = featherAlpha(alpha, sw, sh, 2);

    const out = ctx.createImageData(sw, sh);
    for (let i = 0; i < sw * sh; i++) {
      const si = i * 4;
      out.data[si] = imageData.data[si];
      out.data[si + 1] = imageData.data[si + 1];
      out.data[si + 2] = imageData.data[si + 2];
      out.data[si + 3] = Math.round(smooth[i]);
    }
    ctx.putImageData(out, 0, 0);
    return c;
  }

  /**
   * 根据用户设置选择抠图算法
   */
  function removeBackgroundCanvas(img, tolerance) {
    return removeBackgroundCanvasV2(img, tolerance);
  }

  let bgRemovalModule = null;

  function imageToProcessCanvas(img, maxSide) {
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    const scale = Math.min(1, maxSide / Math.max(nw, nh));
    const w = Math.max(1, Math.round(nw * scale));
    const h = Math.max(1, Math.round(nh * scale));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c;
  }

  /** 仅在半透明边缘带平滑 alpha，保留发丝细节 */
  function refineAlphaChannel(alpha, w, h, strength) {
    const out = new Float32Array(alpha.length);
    const s = Math.max(0.35, Math.min(1, strength));

    for (let i = 0; i < alpha.length; i++) {
      const a = alpha[i];
      if (a <= 4 || a >= 251) {
        out[i] = a;
        continue;
      }
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = (i % w) + dx;
          const ny = ((i / w) | 0) + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          sum += alpha[ny * w + nx];
          count++;
        }
      }
      const blurred = sum / count;
      const edge = Math.min(a, 255 - a) < 64;
      out[i] = edge ? a * (1 - 0.35 * s) + blurred * (0.35 * s) : a;
    }

    for (let pass = 0; pass < 2; pass++) {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          const a = out[i];
          if (a < 18 || a > 237) continue;
          const lumN = out[i - w];
          const lumS = out[i + w];
          if (a > lumN + 28 && a > lumS + 28) {
            out[i] = Math.max(lumN, lumS) * 0.92 + a * 0.08 * (1 - s * 0.5);
          }
        }
      }
    }

    return out;
  }

  /** 用原图 RGB + AI 蒙版合成，并对边缘做去色边（减轻白发丝/白边） */
  function compositeWithRefinedMask(sourceCanvas, maskCanvas, strength) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    const src = srcCtx.getImageData(0, 0, w, h);
    const mask = maskCtx.getImageData(0, 0, w, h);

    const alpha = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const mi = i * 4;
      const m = (mask.data[mi] + mask.data[mi + 1] + mask.data[mi + 2]) / 3;
      alpha[i] = m;
    }

    const refined = refineAlphaChannel(alpha, w, h, strength);
    const out = srcCtx.createImageData(w, h);
    const s = Math.max(0.35, Math.min(1, strength));

    for (let i = 0; i < w * h; i++) {
      const si = i * 4;
      let a = refined[i] / 255;
      if (a < 0.004) {
        out.data[si + 3] = 0;
        continue;
      }

      let r = src.data[si];
      let g = src.data[si + 1];
      let b = src.data[si + 2];
      const srcLum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (a > 0.04 && a < 0.96) {
        const af = 1 / Math.max(a, 0.05);
        let ur = r * af;
        let ug = g * af;
        let ub = b * af;
        const maxC = Math.max(ur, ug, ub);
        const minC = Math.min(ur, ug, ub);
        if (maxC - minC < 35 && maxC > 200) {
          const pull = (maxC - 200) / 55 * s;
          ur = ur * (1 - pull) + srcLum * pull;
          ug = ug * (1 - pull) + srcLum * pull;
          ub = ub * (1 - pull) + srcLum * pull;
        }
        r = ur * a + r * (1 - a);
        g = ug * a + g * (1 - a);
        b = ub * a + b * (1 - a);
        if (srcLum < 95 && a < 0.85) {
          a = Math.min(a * (1 + 0.12 * s), 1);
        }
      }

      out.data[si] = Math.round(Math.max(0, Math.min(255, r)));
      out.data[si + 1] = Math.round(Math.max(0, Math.min(255, g)));
      out.data[si + 2] = Math.round(Math.max(0, Math.min(255, b)));
      out.data[si + 3] = Math.round(Math.max(0, Math.min(255, a * 255)));
    }

    const result = document.createElement('canvas');
    result.width = w;
    result.height = h;
    result.getContext('2d').putImageData(out, 0, 0);
    return result;
  }

  /** 1.5.7+ 使用 lodash-es；勿用 1.4.5 的 jsdelivr +esm（会触发 lodash memoize 导出错误） */
  async function loadBgRemovalModule() {
    if (bgRemovalModule) return bgRemovalModule;
    const sources = [
      'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/dist/index.mjs',
      'https://esm.sh/@imgly/background-removal@1.5.7?bundle',
    ];
    let lastError;
    for (const src of sources) {
      try {
        bgRemovalModule = await import(/* @vite-ignore */ src);
        return bgRemovalModule;
      } catch (e) {
        lastError = e;
        console.warn('[photo] AI 库加载失败:', src, e);
      }
    }
    throw lastError || new Error('AI 抠图库加载失败');
  }

  async function fetchAiMaskData(img) {
    const mod = await loadBgRemovalModule();
    const removeBackground =
      typeof mod.removeBackground === 'function' ? mod.removeBackground : mod.default;
    if (typeof removeBackground !== 'function') {
      throw new Error('AI 抠图库接口异常');
    }

    const sourceCanvas = imageToProcessCanvas(img, 1600);
    const blob = await canvasToBlob(sourceCanvas, 'image/png');
    const maskBlob = await removeBackground(blob, {
      publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.5.7/dist/',
      model: 'isnet',
      output: { format: 'image/png', quality: 1, type: 'mask' },
      progress: (key, current, total) => {
        const pct = total ? Math.round((current / total) * 100) : 0;
        showLoading(true, `AI 分割蒙版 ${pct}%…`);
      },
    });

    const maskUrl = URL.createObjectURL(maskBlob);
    const maskImg = await loadImageFromUrl(maskUrl);
    URL.revokeObjectURL(maskUrl);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = sourceCanvas.width;
    maskCanvas.height = sourceCanvas.height;
    maskCanvas.getContext('2d').drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);

    return { sourceCanvas, maskCanvas };
  }

  function drawImageToCanvas(img) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), type || 'image/png', quality ?? 0.92);
    });
  }

  function computeCropRect(sw, sh, tw, th, headOffsetPct, zoomPct) {
    const targetAspect = tw / th;
    const zoom = zoomPct / 100;
    const effW = sw / zoom;
    const effH = sh / zoom;

    let cropW, cropH;
    if (effW / effH > targetAspect) {
      cropH = effH;
      cropW = effH * targetAspect;
    } else {
      cropW = effW;
      cropH = effW / targetAspect;
    }

    let cropX = (sw - cropW) / 2;
    let cropY = (sh - cropH) * (headOffsetPct / 100);

    cropX = Math.max(0, Math.min(sw - cropW, cropX));
    cropY = Math.max(0, Math.min(sh - cropH, cropY));

    return { cropX, cropY, cropW, cropH };
  }

  async function getSubjectCanvas() {
    const img = state.sourceImage;
    if (!img) throw new Error('请先上传照片');

    if (getBgMode() === 'ai') {
      try {
        if (!state.aiProc) {
          showLoading(true, 'AI 抠图中，首次加载模型较慢…');
          state.aiProc = await fetchAiMaskData(img);
        }
        showLoading(true, '发丝边缘精修…');
        const cut = compositeWithRefinedMask(
          state.aiProc.sourceCanvas,
          state.aiProc.maskCanvas,
          state.edgeRefine / 100
        );
        showLoading(false);
        return cut;
      } catch (e) {
        console.error('[photo] AI 抠图失败，回退智能抠图:', e);
        showLoading(false);
        setStatus(
          'AI 抠图加载失败，已改用「智能抠图」。若仅需纯色背景请保持默认模式。',
          'error'
        );
        return removeBackgroundCanvas(img, state.tolerance);
      }
    }

    return removeBackgroundCanvas(img, state.tolerance);
  }

  async function renderIdPhoto() {
    if (!state.sourceImage || state.processing) return;
    state.processing = true;
    if (els.convertBtn) els.convertBtn.disabled = true;

    try {
      setStatus('正在处理…');
      showLoading(true, '正在生成证件照…');

      const sizeKey = normalizeSizeKey(state.selectedSize);
      const size = SIZES[sizeKey] || SIZES['1inch'];
      const [tw, th] = size.px;
      const bgHex = BACKGROUNDS[state.selectedBg];
      const isOriginalBg = state.selectedBg === 'original';

      let sourceCanvas;
      if (isOriginalBg) {
        // 原色模式：直接使用原图，不抠图
        sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = state.sourceImage.naturalWidth;
        sourceCanvas.height = state.sourceImage.naturalHeight;
        const ctx = sourceCanvas.getContext('2d');
        ctx.drawImage(state.sourceImage, 0, 0);
      } else {
        sourceCanvas = await getSubjectCanvas();
      }

      const sw = sourceCanvas.width;
      const sh = sourceCanvas.height;

      const { cropX, cropY, cropW, cropH } = computeCropRect(
        sw,
        sh,
        tw,
        th,
        state.headOffset,
        state.zoom
      );

      const out = document.createElement('canvas');
      out.width = tw;
      out.height = th;
      const ctx = out.getContext('2d');

      if (isOriginalBg) {
        // 原色模式：绘制原图裁剪区域
        ctx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, tw, th);
      } else {
        // 换底模式：先填底色，再绘制主体
        ctx.fillStyle = bgHex || '#ffffff';
        ctx.fillRect(0, 0, tw, th);
        ctx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, tw, th);
      }

      revokeResultUrl();
      const blob = await canvasToBlob(out, 'image/jpeg', 0.95);
      state.resultUrl = URL.createObjectURL(blob);

      const meta = `${size.label} · ${tw}×${th}px · ${size.mm[0]}×${size.mm[1]}mm`;
      showResultPreview(state.resultUrl, meta);

      if (els.downloadBtn) els.downloadBtn.disabled = false;
      setStatus('生成完成，可下载', 'success');
    } catch (e) {
      console.error(e);
      setStatus(e.message || '处理失败', 'error');
    } finally {
      showLoading(false);
      state.processing = false;
      if (els.convertBtn) els.convertBtn.disabled = !state.sourceImage;
    }
  }

  let previewTimer = null;
  function schedulePreview() {
    if (!state.sourceImage) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => renderIdPhoto(), 600);
  }

  function bindSizeGrid() {
    if (!els.sizeGrid) return;
    els.sizeGrid.innerHTML = '';
    Object.entries(SIZES).forEach(([key, s]) => {
      if (['small1inch', 'large1inch', 'small2inch', 'idcard'].includes(key)) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'size-tag' + (key === state.selectedSize ? ' active selected' : '');
      btn.dataset.size = key;
      btn.innerHTML = `${s.label} <span class="size-info">${s.mm[0]}×${s.mm[1]}mm / ${s.px[0]}×${s.px[1]}px</span>`;
      btn.addEventListener('click', () => {
        state.selectedSize = key;
        $$('.size-tag').forEach((el) => {
          el.classList.toggle('active', el.dataset.size === key);
        });
        schedulePreview();
      });
      els.sizeGrid.appendChild(btn);
    });
  }

  function bindLegacySizeOptions() {
    if (els.sizeGrid) return;
    const options = $$('.size-option');
    if (!options.length) return;
    options.forEach((option) => {
      option.addEventListener('click', () => {
        $$('.size-option').forEach((opt) => {
          opt.classList.remove('selected', 'active');
        });
        option.classList.add('selected', 'active');
        state.selectedSize = normalizeSizeKey(option.dataset.size);
      });
    });
    const first =
      document.querySelector('.size-option[data-size="1inch"]') ||
      document.querySelector('.size-option.active') ||
      options[0];
    if (first) {
      first.classList.add('selected', 'active');
      state.selectedSize = normalizeSizeKey(first.dataset.size);
    }
  }

  function bindBgGrid() {
    if (els.bgGrid) {
      els.bgGrid.innerHTML = '';
      const labels = { original: '原色', white: '白底', blue: '蓝底', red: '红底', green: '绿底', yellow: '黄底', gray: '灰底' };
      Object.entries(BACKGROUNDS).forEach(([key, hex]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bg-tag' + (key === state.selectedBg ? ' active selected' : '');
        btn.dataset.bg = key;
        btn.dataset.color = hex || '';
        // 原色用图标，其他用颜色圆点
        btn.innerHTML = key === 'original'
          ? `<span class="bg-icon">✦</span>${labels[key]}`
          : `<span class="bg-dot" style="background:${hex}"></span>${labels[key]}`;
        btn.addEventListener('click', () => {
          state.selectedBg = key;
          $$('.bg-tag').forEach((el) => {
            el.classList.toggle('active', el.dataset.bg === key);
          });
          schedulePreview();
        });
        els.bgGrid.appendChild(btn);
      });
      return;
    }

    $$('.bg-color-card').forEach((card) => {
      card.addEventListener('click', () => {
        $$('.bg-color-card').forEach((c) => c.classList.remove('selected', 'active'));
        card.classList.add('selected', 'active');
        const bgKey = card.dataset.bg || 'white';
        state.selectedBg = bgKey in BACKGROUNDS ? bgKey : 'white';
        schedulePreview();
      });
    });
  }

  function bindUpload() {
    if (!els.fileInput) {
      console.error('[photo] 未找到 file input (#photoFile / #photoUpload)');
      setStatus('上传控件未配置，请联系站长更新页面', 'error');
      return;
    }

    els.fileInput.addEventListener('change', onFileInputChange);

    if (els.selectBtn && els.selectBtn.tagName !== 'LABEL') {
      els.selectBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        els.fileInput.click();
      });
    }

    if (els.dropZone) {
      ['dragenter', 'dragover'].forEach((ev) => {
        els.dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          els.dropZone.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach((ev) => {
        els.dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          els.dropZone.classList.remove('dragover');
        });
      });
      els.dropZone.addEventListener('drop', (e) => {
        const f = e.dataTransfer?.files?.[0];
        if (f) handleFile(f);
      });
      els.dropZone.addEventListener('click', (e) => {
        if (els.selectBtn && (e.target === els.selectBtn || els.selectBtn.contains(e.target))) return;
        if (e.target === els.fileInput) return;
        els.fileInput.click();
      });
    }
  }

  function bindControls() {
    if (els.convertBtn) {
      els.convertBtn.addEventListener('click', () => renderIdPhoto());
    }
    if (els.downloadBtn) {
      els.downloadBtn.addEventListener('click', () => {
        if (!state.resultUrl) return;
        const a = document.createElement('a');
        const size = SIZES[normalizeSizeKey(state.selectedSize)] || SIZES['1inch'];
        a.href = state.resultUrl;
        a.download = `证件照_${size.label}_${state.selectedBg}.jpg`;
        a.click();
      });
    }

    els.resetBtn?.addEventListener('click', () => {
      state.sourceImage = null;
      state.sourceBlob = null;
      state.selectedSize = '1inch';
      state.selectedBg = 'white';
      state.tolerance = 15;
      state.headOffset = 12;
      state.zoom = 100;
      state.edgeRefine = 72;
      state.aiProc = null;
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
      }
      revokeResultUrl();
      if (els.fileInput) els.fileInput.value = '';
      if (els.previewOriginal) {
        els.previewOriginal.hidden = true;
        els.previewPlaceholder && (els.previewPlaceholder.hidden = false);
      }
      if (els.previewResult) {
        els.previewResult.hidden = true;
        els.resultPlaceholder && (els.resultPlaceholder.hidden = false);
      }
      if (els.convertBtn) els.convertBtn.disabled = true;
      if (els.downloadBtn) els.downloadBtn.disabled = true;
      if (els.resultMeta) els.resultMeta.textContent = '';
      // 恢复滑块默认值
      if (els.tolerance) {
        els.tolerance.value = 15;
        if (els.toleranceVal) els.toleranceVal.textContent = '15';
      }
      if (els.headOffset) {
        els.headOffset.value = 12;
        if (els.headOffsetVal) els.headOffsetVal.textContent = '12%';
      }
      if (els.zoom) {
        els.zoom.value = 100;
        if (els.zoomVal) els.zoomVal.textContent = '100%';
      }
      if (els.edgeRefine) {
        els.edgeRefine.value = 72;
        if (els.edgeRefineVal) els.edgeRefineVal.textContent = '72';
      }
      // 恢复单选按钮默认值
      const whiteRadio = document.querySelector('input[name="bgColor"][value="white"]');
      if (whiteRadio) whiteRadio.checked = true;
      const size1inch = document.querySelector('input[name="photoSize"][value="1inch"]');
      if (size1inch) size1inch.checked = true;
      // 移除选中样式
      document.querySelectorAll('#bgGrid .size-option.selected').forEach(el => el.classList.remove('selected'));
      document.querySelectorAll('#sizeGrid .size-option.selected').forEach(el => el.classList.remove('selected'));
      const whiteOption = document.querySelector('#bgGrid .size-option[data-color="white"]');
      if (whiteOption) whiteOption.classList.add('selected');
      const inchOption = document.querySelector('#sizeGrid .size-option[data-size="1inch"]');
      if (inchOption) inchOption.classList.add('selected');
      setStatus('已重置');
    });

    if (els.tolerance) {
      els.tolerance.addEventListener('input', () => {
        state.tolerance = Number(els.tolerance.value);
        if (els.toleranceVal) els.toleranceVal.textContent = state.tolerance;
        state.aiProc = null;
        schedulePreview();
      });
    }

    if (els.headOffset) {
      els.headOffset.addEventListener('input', () => {
        state.headOffset = Number(els.headOffset.value);
        if (els.headOffsetVal) els.headOffsetVal.textContent = state.headOffset + '%';
        schedulePreview();
      });
    }

    if (els.zoom) {
      els.zoom.addEventListener('input', () => {
        state.zoom = Number(els.zoom.value);
        if (els.zoomVal) els.zoomVal.textContent = state.zoom + '%';
        schedulePreview();
      });
    }

    els.modeRadios.forEach((r) => {
      r.addEventListener('change', () => {
        state.aiProc = null;
        if (els.tolerance) els.tolerance.disabled = getBgMode() === 'ai';
        if (els.edgeRefineRow) {
          els.edgeRefineRow.hidden = getBgMode() !== 'ai';
        }
        schedulePreview();
      });
    });

    if (els.edgeRefine) {
      els.edgeRefine.addEventListener('input', () => {
        state.edgeRefine = Number(els.edgeRefine.value);
        if (els.edgeRefineVal) els.edgeRefineVal.textContent = state.edgeRefine + '%';
        schedulePreview();
      });
    }
  }

  function updateModeUI() {
    const isAi = getBgMode() === 'ai';
    if (els.tolerance) els.tolerance.disabled = isAi;
    if (els.edgeRefineRow) els.edgeRefineRow.hidden = !isAi;
  }

  function init() {
    try {
      resolveElements();
      bindUpload();
      bindSizeGrid();
      bindLegacySizeOptions();
      bindBgGrid();
      bindControls();

      if (els.toleranceVal && els.tolerance) els.toleranceVal.textContent = state.tolerance;
      if (els.headOffsetVal && els.headOffset) els.headOffsetVal.textContent = state.headOffset + '%';
    if (els.zoomVal && els.zoom) els.zoomVal.textContent = state.zoom + '%';
    if (els.edgeRefineVal && els.edgeRefine) els.edgeRefineVal.textContent = state.edgeRefine + '%';
    if (els.convertBtn) els.convertBtn.disabled = true;
    if (els.downloadBtn) els.downloadBtn.disabled = true;
    updateModeUI();

    if (els.fileInput) {
      setStatus('请上传一张证件照或半身照');
    }
    } catch (err) {
      console.error('[photo] init failed:', err);
      setStatus('页面初始化异常: ' + (err.message || err), 'error');
    }
  }

  window.PhotoTool = {
    handleFile,
    renderIdPhoto,
    get ready() {
      return !!state.sourceImage;
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
