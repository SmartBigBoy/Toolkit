(function() {
  const canvas = document.getElementById('ssCanvas');
  const ctx = canvas.getContext('2d');
  const startScreen = document.getElementById('startScreen');
  const screenPreview = document.getElementById('screenPreview');
  const toolbar = document.getElementById('ssToolbar');
  const bottom = document.getElementById('ssBottom');
  const cropOverlay = document.getElementById('cropOverlay');

  let stream = null;
  let imageData = null; // original captured image data (for crop reset)
  let scaleX = 1, scaleY = 1;

  // ── 标注状态 ──
  let currentTool = 'rect';
  let currentColor = '#e74c3c';
  let currentSize = 4;
  let isDrawing = false;
  let startX, startY;
  let history = []; // 操作历史
  let historyIdx = -1;
  let isCropping = false;
  let cropStartX, cropStartY, cropEndX, cropEndY;
  let cropActive = false;

  // ── DOM ──
  const btnStart = document.getElementById('btnStartCapture');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const recaptureBtn = document.getElementById('recaptureBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const colorInput = document.getElementById('colorInput');

  // ── 开始截图 ──
  btnStart.addEventListener('click', startCapture);
  recaptureBtn.addEventListener('click', startCapture);
  cancelBtn.addEventListener('click', exit);

  async function startCapture() {
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // 等一帧后截图
      video.addEventListener('loadeddata', () => {
        setTimeout(() => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          stream.getTracks().forEach(t => t.stop());
          stream = null;

          // 保存原始数据
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          startScreen.style.display = 'none';
          screenPreview.classList.add('active');
          toolbar.classList.add('active');
          bottom.classList.add('active');
          updateCanvasScale();
          resetHistory();
        }, 200);
      }, { once: true });
    } catch(e) {
      if (e.name !== 'NotAllowedError') console.error(e);
    }
  }

  function updateCanvasScale() {
    const rect = canvas.getBoundingClientRect();
    scaleX = canvas.width / rect.width;
    scaleY = canvas.height / rect.height;
  }

  function exit() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    startScreen.style.display = '';
    screenPreview.classList.remove('active');
    toolbar.classList.remove('active');
    bottom.classList.remove('active');
  }

  // ── 工具切换 ──
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
      canvas.style.cursor = currentTool === 'text' ? 'text' : currentTool === 'crop' ? 'crosshair' : 'crosshair';
      if (currentTool === 'crop') { isCropping = true; cropActive = false; cropOverlay.classList.remove('active'); }
      else isCropping = false;
    });
  });

  // ── 颜色 ──
  colorInput.addEventListener('input', () => {
    currentColor = colorInput.value;
    document.getElementById('colorPicker').style.background = currentColor;
  });

  // ── 粗细 ──
  document.querySelectorAll('[data-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-size]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSize = parseInt(btn.dataset.size);
    });
  });

  // ── 撤销 ──
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  // ── 快捷键 ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (isCropping) cancelCrop(); else exit(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { if (e.shiftKey) redo(); else undo(); e.preventDefault(); }
  });

  // ── 鼠标事件 ──
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);

  // 触屏
  canvas.addEventListener('touchstart', (e) => { const t = e.touches[0]; onMouseDown({ offsetX: t.clientX - canvas.getBoundingClientRect().left, offsetY: t.clientY - canvas.getBoundingClientRect().top, preventDefault: () => e.preventDefault() }); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { const t = e.touches[0]; onMouseMove({ offsetX: t.clientX - canvas.getBoundingClientRect().left, offsetY: t.clientY - canvas.getBoundingClientRect().top, preventDefault: () => e.preventDefault() }); }, { passive: false });
  canvas.addEventListener('touchend', (e) => { onMouseUp({}); });

  // ── 绘制 ──
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function onMouseDown(e) {
    const pos = { x: (e.offsetX) * scaleX, y: (e.offsetY) * scaleY };
    if (!pos.x && !pos.y && e.clientX) { const r = canvas.getBoundingClientRect(); pos.x = (e.clientX - r.left) * scaleX; pos.y = (e.clientY - r.top) * scaleY; }

    if (isCropping) {
      cropStartX = pos.x; cropStartY = pos.y;
      cropEndX = pos.x; cropEndY = pos.y;
      cropActive = true;
      return;
    }

    isDrawing = true;
    startX = pos.x; startY = pos.y;
  }

  function onMouseMove(e) {
    const pos = { x: (e.offsetX) * scaleX, y: (e.offsetY) * scaleY };
    if (!pos.x && !pos.y && e.clientX) { const r = canvas.getBoundingClientRect(); pos.x = (e.clientX - r.left) * scaleX; pos.y = (e.clientY - r.top) * scaleY; }

    if (isCropping && cropActive) {
      cropEndX = pos.x; cropEndY = pos.y;
      drawCropOverlay();
      return;
    }

    if (!isDrawing) return;

    // 实时预览（画到临时层）
    restoreFromHistory();
    drawShape(startX, startY, pos.x, pos.y, false);
  }

  function onMouseUp(e) {
    if (isCropping && cropActive) {
      cropActive = false;
      if (Math.abs(cropEndX - cropStartX) > 10 && Math.abs(cropEndY - cropStartY) > 10) {
        doCrop();
      } else {
        cropOverlay.classList.remove('active');
      }
      return;
    }

    if (!isDrawing) return;
    isDrawing = false;

    // 保存到历史
    const pos = { x: startX, y: startY };
    // 获取结束位置
    const lastMove = { x: startX, y: startY }; // fallback
    history.push({ tool: currentTool, x1: startX, y1: startY, x2: lastMove.x, y2: lastMove.y, color: currentColor, size: currentSize });
    historyIdx = history.length - 1;
    // 截取最终状态
    saveHistorySnapshot();
    updateUndoButtons();
  }

  function drawShape(x1, y1, x2, y2, commit) {
    ctx.save();
    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (currentTool) {
      case 'rect':
        const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.globalAlpha = 0.15; ctx.fillRect(rx, ry, rw, rh); ctx.globalAlpha = 1;
        break;
      case 'arrow':
        drawArrow(ctx, x1, y1, x2, y2);
        break;
      case 'text':
        ctx.font = (currentSize * 6) + 'px sans-serif';
        ctx.fillText('文本', x1, y1);
        break;
      case 'pen':
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        break;
      case 'blur':
        drawBlur(ctx, x1, y1, x2, y2);
        break;
    }
    ctx.restore();
  }

  function drawArrow(c, x1, y1, x2, y2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = Math.min(20, Math.hypot(x2 - x1, y2 - y1) / 3);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.beginPath(); c.moveTo(x2, y2);
    c.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
    c.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
    c.closePath(); c.fill();
  }

  function drawBlur(c, x1, y1, x2, y2) {
    const r = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1));
    if (r < 5) return;
    const bx = Math.min(x1, x2), by = Math.min(y1, y2), bw = Math.abs(x2 - x1), bh = Math.abs(y2 - y1);
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = Math.ceil(bw); blurCanvas.height = Math.ceil(bh);
    const bctx = blurCanvas.getContext('2d');
    bctx.drawImage(canvas, bx, by, bw, bh, 0, 0, Math.ceil(bw / 8), Math.ceil(bh / 8));
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(blurCanvas, 0, 0, Math.ceil(bw / 8), Math.ceil(bh / 8), 0, 0, Math.ceil(bw), Math.ceil(bh));
    c.drawImage(blurCanvas, bx, by);
  }

  // ── 裁剪 ──
  function drawCropOverlay() {
    const r = canvas.getBoundingClientRect();
    const sx = Math.min(cropStartX, cropEndX) / scaleX + r.left;
    const sy = Math.min(cropStartY, cropEndY) / scaleY + r.top;
    const sw = Math.abs(cropEndX - cropStartX) / scaleX;
    const sh = Math.abs(cropEndY - cropStartY) / scaleY;
    cropOverlay.style.left = sx + 'px'; cropOverlay.style.top = sy + 'px';
    cropOverlay.style.width = sw + 'px'; cropOverlay.style.height = sh + 'px';
    cropOverlay.classList.add('active');
  }

  function doCrop() {
    const x = Math.min(cropStartX, cropEndX), y = Math.min(cropStartY, cropEndY);
    const w = Math.abs(cropEndX - cropStartX), h = Math.abs(cropEndY - cropStartY);
    if (w < 5 || h < 5) { cropOverlay.classList.remove('active'); return; }
    const imgData = ctx.getImageData(x, y, w, h);
    // 先保存原图为当前画布
    const prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = w; canvas.height = h;
    ctx.putImageData(imgData, 0, 0);
    imageData = ctx.getImageData(0, 0, w, h);
    cropOverlay.classList.remove('active');
    isCropping = false;
    // 切换回矩形工具
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tool="rect"]').classList.add('active');
    currentTool = 'rect';
    updateCanvasScale();
    resetHistory();
  }

  function cancelCrop() {
    cropActive = false;
    cropOverlay.classList.remove('active');
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tool="rect"]').classList.add('active');
    currentTool = 'rect';
    isCropping = false;
  }

  // ── 历史 ──
  function resetHistory() {
    history = []; historyIdx = -1;
    saveHistorySnapshot();
    updateUndoButtons();
  }

  function saveHistorySnapshot() {
    history[historyIdx + 1] = { snapshot: ctx.getImageData(0, 0, canvas.width, canvas.height) };
    history = history.slice(0, historyIdx + 2);
    historyIdx = history.length - 1;
  }

  function restoreFromHistory() {
    if (historyIdx >= 0 && history[historyIdx] && history[historyIdx].snapshot) {
      ctx.putImageData(history[historyIdx].snapshot, 0, 0);
    } else if (imageData) {
      ctx.putImageData(imageData, 0, 0);
    }
  }

  function undo() {
    if (historyIdx <= 0) return;
    historyIdx--;
    if (history[historyIdx] && history[historyIdx].snapshot) {
      ctx.putImageData(history[historyIdx].snapshot, 0, 0);
    } else if (imageData) {
      ctx.putImageData(imageData, 0, 0);
    }
    updateUndoButtons();
  }

  function redo() {
    if (historyIdx >= history.length - 1) return;
    historyIdx++;
    if (history[historyIdx] && history[historyIdx].snapshot) {
      ctx.putImageData(history[historyIdx].snapshot, 0, 0);
    }
    updateUndoButtons();
  }

  function updateUndoButtons() {
    undoBtn.style.opacity = historyIdx > 0 ? '1' : '0.3';
    redoBtn.style.opacity = historyIdx < history.length - 1 ? '1' : '0.3';
  }

  // ── 下载 ──
  downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'screenshot_' + new Date().toISOString().slice(0,19).replace(/[:-]/g,'') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // ── 复制到剪贴板 ──
  copyBtn.addEventListener('click', async () => {
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      copyBtn.textContent = '✅ 已复制';
      setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i> 复制'; }, 2000);
    } catch(e) { copyBtn.textContent = '复制失败'; }
  });

  // ── 显示复制按钮（支持 Clipboard API 时） ──
  if (navigator.clipboard && navigator.clipboard.write) copyBtn.style.display = '';
})();
