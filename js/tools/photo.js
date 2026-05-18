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
    selectedBg: 'white',
    tolerance: 42,
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

  function removeBackgroundCanvas(img, tolerance) {
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
    console.log('[photo] renderIdPhoto called, sourceImage:', !!state.sourceImage, 'processing:', state.processing);
    if (!state.sourceImage || state.processing) return;
    state.processing = true;
    if (els.convertBtn) els.convertBtn.disabled = true;

    try {
      setStatus('正在处理…');
      showLoading(true, '正在生成证件照…');

      const sizeKey = normalizeSizeKey(state.selectedSize);
      const size = SIZES[sizeKey] || SIZES['1inch'];
      const [tw, th] = size.px;
      const bgHex = BACKGROUNDS[state.selectedBg] || BACKGROUNDS.white;

      const subject = await getSubjectCanvas();
      const sw = subject.width;
      const sh = subject.height;

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
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, tw, th);
      ctx.drawImage(subject, cropX, cropY, cropW, cropH, 0, 0, tw, th);

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
      btn.className = 'size-card size-option' + (key === state.selectedSize ? ' active selected' : '');
      btn.dataset.size = key;
      btn.innerHTML = `
        <span class="size-name">${s.label}</span>
        <span class="size-mm">${s.mm[0]}×${s.mm[1]}mm</span>
        <span class="size-px">${s.px[0]}×${s.px[1]}px</span>
      `;
      btn.addEventListener('click', () => {
        state.selectedSize = key;
        $$('.size-card, .size-option').forEach((el) => {
          el.classList.toggle('active', el.dataset.size === key);
          el.classList.toggle('selected', el.dataset.size === key);
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
      const labels = { white: '白底', blue: '蓝底', red: '红底', green: '绿底', yellow: '黄底', gray: '灰底' };
      Object.entries(BACKGROUNDS).forEach(([key, hex]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bg-card bg-color-card' + (key === state.selectedBg ? ' active selected' : '');
        btn.dataset.bg = key;
        btn.dataset.color = hex;
        btn.dataset.name = labels[key];
        btn.innerHTML = `<span class="bg-swatch" style="background:${hex}"></span><span class="bg-label">${labels[key]}</span>`;
        btn.addEventListener('click', () => {
          state.selectedBg = key;
          $$('.bg-card, .bg-color-card').forEach((el) => {
            el.classList.toggle('active', el.dataset.bg === key);
            el.classList.toggle('selected', el.dataset.bg === key);
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
      els.convertBtn.addEventListener('click', () => {
        console.log('[photo] convertBtn clicked, sourceImage:', !!state.sourceImage, 'processing:', state.processing);
        renderIdPhoto();
      });
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
