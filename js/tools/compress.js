(function() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const resultArea = document.getElementById('resultArea');
  const origPreview = document.getElementById('origPreview');
  const compPreview = document.getElementById('compPreview');
  const origName = document.getElementById('origName');
  const origSize = document.getElementById('origSize');
  const compSize = document.getElementById('compSize');
  const compFormat = document.getElementById('compFormat');
  const quality = document.getElementById('quality');
  const qualityVal = document.getElementById('qualityVal');
  const maxWidth = document.getElementById('maxWidth');
  const outputFormat = document.getElementById('outputFormat');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const compressRate = document.getElementById('compressRate');

  let currentFile = null;
  let originalImage = null;
  let compressedBlob = null;
  let compressedDataUrl = null;

  // ── 拖拽上传 ──
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

  // ── 质量滑块 ──
  quality.addEventListener('input', () => {
    qualityVal.textContent = quality.value + '%';
    if (originalImage) compress();
  });

  // ── 参数变更 ──
  maxWidth.addEventListener('change', () => { if (originalImage) compress(); });
  outputFormat.addEventListener('change', () => { if (originalImage) compress(); });

  // ── 下载 ──
  downloadBtn.addEventListener('click', () => {
    if (!compressedBlob) return;
    const ext = outputFormat.value === 'image/jpeg' ? 'jpg' : outputFormat.value === 'image/webp' ? 'webp' : 'png';
    const name = (currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'image') + '_compressed.' + ext;
    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  // ── 重置 ──
  resetBtn.addEventListener('click', () => {
    currentFile = null; originalImage = null; compressedBlob = null; compressedDataUrl = null;
    resultArea.style.display = 'none';
    fileInput.value = '';
  });

  // ── 处理文件 ──
  function handleFile(file) {
    if (file.size > 20 * 1024 * 1024) { alert('图片过大，请选择 20MB 以内的图片'); return; }
    currentFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        originalImage = img;
        origPreview.src = e.target.result;
        origName.textContent = file.name;
        origSize.textContent = formatSize(file.size);
        resultArea.style.display = 'block';
        downloadBtn.disabled = false;
        compress();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ── 压缩 ──
  function compress() {
    const img = originalImage;
    if (!img) return;
    if (img.width === 0 || img.height === 0) return;

    const mw = parseInt(maxWidth.value);
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;

    // 缩放
    if (mw > 0 && w > mw) {
      h = Math.round(h * (mw / w));
      w = mw;
    }

    const q = parseInt(quality.value) / 100;
    const fmt = outputFormat.value;

    // 创建 canvas 并压缩
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // 白底（JPEG 不支持透明）
    if (fmt === 'image/jpeg') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);

    // 输出为 blob
    canvas.toBlob((blob) => {
      if (!blob) return;
      compressedBlob = blob;

      // 显示压缩预览
      const url = URL.createObjectURL(blob);
      compPreview.src = url;
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      compSize.textContent = formatSize(blob.size);
      const ext = fmt === 'image/jpeg' ? 'jpg' : fmt === 'image/webp' ? 'webp' : 'png';
      compFormat.textContent = ext.toUpperCase();

      // 压缩率
      const orig = currentFile ? currentFile.size : 0;
      if (orig > 0) {
        const ratio = ((1 - blob.size / orig) * 100).toFixed(1);
        const saved = orig - blob.size;
        if (saved > 0) {
          compressRate.innerHTML = '压缩了 <span class="rate">' + ratio + '%</span> （节省 ' + formatSize(saved) + '）';
          compressRate.className = 'compress-rate';
        } else {
          compressRate.innerHTML = '文件比原图大了 <span class="rate negative">' + Math.abs(ratio) + '%</span>';
          compressRate.className = 'compress-rate';
        }
      }
    }, fmt, q);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
})();
