(function() {
  'use strict';

  // ═══ 状态 ═══
  let phase = 'idle';          // idle | selecting | annotating
  let stream = null;
  let capturedImage = null;

  // 双层 canvas
  let annotCanvas, annotCtx;       // 可见画布（DOM）
  let baseCanvas, baseCtx;         // 离屏：已完成的内容
  let overlayCanvas, overlayCtx;   // 离屏：实时绘制层

  // 选区
  let scaleX = 1, scaleY = 1;
  let selStartX, selStartY, selEndX, selEndY, isSelecting = false;

  // 标注绘制
  let currentTool = 'rect';
  let currentColor = '#e74c3c';
  let currentSize = 4;
  let isDrawing = false;
  let drawStartX, drawStartY;
  let penPoints = [];          // 画笔自由绘制点集

  // 撤销/重做（canvas 快照，封顶 30）
  const MAX_HISTORY = 30;
  let undoStack = [];
  let redoStack = [];

  // 裁剪状态
  let cropX1, cropY1, cropX2, cropY2, isCropping = false;

  // 文字输入浮层
  let textInputEl = null;

  // ═══ DOM ═══
  const container = document.getElementById('ssContainer');
  const startScreen = document.getElementById('startScreen');
  const stageSelect = document.getElementById('stageSelect');
  const stageAnnot = document.getElementById('stageAnnot');
  const captureCanvas = document.getElementById('captureCanvas');
  const toolbar = document.getElementById('annotToolbar');
  const bottom = document.getElementById('annotBottom');
  const cropInfo = document.getElementById('cropInfo');

  // Toast 提示
  function toast(msg, dur) {
    dur = dur || 2000;
    let el = document.getElementById('ssToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ssToast';
      el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;background:#1e293b;color:#fff;padding:10px 24px;border-radius:10px;font-size:14px;font-weight:500;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:90vw;text-align:center';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._tid);
    el._tid = setTimeout(() => { el.style.opacity = '0'; }, dur);
  }

  // ═══ 开始截图 ═══
  document.getElementById('btnStartCapture').addEventListener('click', startCapture);
  // 全屏截图按钮（可选快捷入口）
  const btnFullCapture = document.getElementById('btnFullCapture');
  if (btnFullCapture) btnFullCapture.addEventListener('click', startCapture);

  async function startCapture() {
    // 检测 API 是否可用（手机浏览器不支持 getDisplayMedia）
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        toast('手机浏览器不支持屏幕截图，请使用电脑端 Chrome/Edge 浏览器打开此页面', 5000);
        // 显示手机端操作引导
        showMobileGuide();
      } else {
        toast('当前浏览器不支持屏幕共享 API，请使用 Chrome 或 Edge 浏览器', 4000);
      }
      return;
    }
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch(e) {
      if (e.name === 'NotAllowedError' || e.name === 'AbortError') {
        toast('已取消屏幕共享');
      } else {
        toast('截图需要 HTTPS 且需授予屏幕共享权限', 3000);
      }
      return;
    }
    try {
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      // 尝试零拷贝抓帧
      let bmp;
      try { bmp = await imageCapture.grabFrame(); } catch(_) {}
      if (!bmp) {
        // 兜底：video 方式
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        const c = document.createElement('canvas');
        c.width = video.videoWidth;
        c.height = video.videoHeight;
        c.getContext('2d').drawImage(video, 0, 0);
        bmp = await createImageBitmap(c);
      }
      stream.getTracks().forEach(t => t.stop());
      stream = null;

      // 用 createImageBitmap 生成的高效位图
      capturedImage = bmp;
      enterSelection();
    } catch(e) {
      console.error(e);
      toast('截图失败，请重试');
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    }
  }

  // ── 手机端引导 ──
  function showMobileGuide() {
    // 移除旧引导
    const old = document.getElementById('mobileGuide');
    if (old) old.remove();

    const guide = document.createElement('div');
    guide.id = 'mobileGuide';
    guide.style.cssText = 'margin-top:20px;padding:20px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:16px;text-align:left;font-size:14px;line-height:1.8';
    guide.innerHTML = [
      '<p style="font-weight:600;color:var(--text-primary);margin-bottom:12px"><i class="fas fa-mobile-alt"></i> 手机端截图方法</p>',
      '<p style="color:var(--text-secondary)">由于浏览器限制，手机端无法直接使用本工具截取屏幕。您可以：</p>',
      '<p style="color:var(--text-primary);margin-top:8px"><strong>方法一：系统截图后上传标注</strong></p>',
      '<ol style="color:var(--text-secondary);padding-left:20px">',
        '<li>使用手机自带截图功能（同时按 电源键 + 音量减）</li>',
        '<li>截好的图会自动保存到相册</li>',
        '<li>使用下方 <strong>「上传图片标注」</strong> 按钮，选择截图即可进入标注工具</li>',
      '</ol>',
      '<p style="color:var(--text-primary);margin-top:8px"><strong>方法二：用电脑打开此页面</strong></p>',
      '<p style="color:var(--text-secondary)">在电脑 Chrome/Edge 浏览器访问 <code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px">toolkit.skin</code>，可使用完整的屏幕截图功能。</p>',
      '<div style="text-align:center;margin-top:16px">',
        '<button id="btnUploadScreenshot" style="padding:12px 24px;border:none;border-radius:10px;background:var(--primary-gradient);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">',
          '<i class="fas fa-upload"></i> 上传图片标注',
        '</button>',
        '<input type="file" id="uploadFileInput" accept="image/*" style="display:none">',
      '</div>',
    ].join('');
    startScreen.appendChild(guide);

    // 上传图片标注
    document.getElementById('btnUploadScreenshot').addEventListener('click', () => {
      document.getElementById('uploadFileInput').click();
    });
    document.getElementById('uploadFileInput').addEventListener('change', function() {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function() {
        const img = new Image();
        img.onload = function() {
          capturedImage = img;
          const g = document.getElementById('mobileGuide');
          if (g) g.remove();
          toast('图片已加载，请框选区域');
          enterSelection();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ═══ 选区阶段 ═══
  function enterSelection() {
    startScreen.style.display = 'none';
    stageSelect.style.display = 'block';
    phase = 'selecting';

    const c = captureCanvas;
    const ctx = c.getContext('2d');
    c.width = capturedImage.width;
    c.height = capturedImage.height;
    ctx.drawImage(capturedImage, 0, 0);

    scaleX = c.width / c.offsetWidth;
    scaleY = c.height / c.offsetHeight;

    c.onmousedown = onSelDown;
    c.onmousemove = onSelMove;
    c.onmouseup = onSelUp;
    c.onmouseleave = onSelUp;
    c.ontouchstart = e => { const t = e.touches[0]; onSelDown({ clientX:t.clientX, clientY:t.clientY }); e.preventDefault(); };
    c.ontouchmove  = e => { const t = e.touches[0]; onSelMove({ clientX:t.clientX, clientY:t.clientY }); e.preventDefault(); };
    c.ontouchend   = onSelUp;

    document.addEventListener('keydown', onKeyDown);
    document.getElementById('btnConfirmCrop').onclick = confirmSelection;
    document.getElementById('btnCancelCrop').onclick = exit;
    cropInfo.textContent = '拖拽选择截图区域，按 Enter 确认，Esc 取消';
  }

  function getSelPos(e) {
    const r = captureCanvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  }

  function onSelDown(e) {
    const p = getSelPos(e);
    selStartX = p.x; selStartY = p.y;
    selEndX = p.x; selEndY = p.y;
    isSelecting = true;
  }

  function onSelMove(e) {
    if (!isSelecting) return;
    const p = getSelPos(e);
    selEndX = p.x; selEndY = p.y;
    drawSelection();
  }

  function onSelUp() {
    if (!isSelecting) return;
    isSelecting = false;
    if (Math.abs(selEndX - selStartX) < 5 || Math.abs(selEndY - selStartY) < 5) return;
    cropInfo.textContent = '按 Enter 确认截图，Esc 重新选择';
  }

  function drawSelection() {
    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(capturedImage, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
    const x = Math.min(selStartX, selEndX), y = Math.min(selStartY, selEndY);
    const w = Math.abs(selEndX - selStartX), h = Math.abs(selEndY - selStartY);
    ctx.drawImage(capturedImage, x, y, w, h, x, y, w, h);
    ctx.strokeStyle = '#007AFF'; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#007AFF'; ctx.font = '13px sans-serif';
    ctx.fillText(Math.round(w) + ' × ' + Math.round(h), x + 6, y - 8);
  }

  // ═══ 确认选区 → 标注 ═══
  function confirmSelection() {
    const x = Math.min(selStartX, selEndX), y = Math.min(selStartY, selEndY);
    const w = Math.abs(selEndX - selStartX), h = Math.abs(selEndY - selStartY);
    if (w < 5 || h < 5) return;

    stageSelect.style.display = 'none';
    stageAnnot.style.display = 'block';
    toolbar.classList.add('active');
    bottom.classList.add('active');
    phase = 'annotating';

    // 可见画布
    annotCanvas = document.getElementById('annotCanvas');
    annotCtx = annotCanvas.getContext('2d');
    annotCanvas.width = Math.round(w);
    annotCanvas.height = Math.round(h);

    // 离屏 base 层
    baseCanvas = document.createElement('canvas');
    baseCanvas.width = annotCanvas.width;
    baseCanvas.height = annotCanvas.height;
    baseCtx = baseCanvas.getContext('2d');

    // 离屏 overlay 层
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = annotCanvas.width;
    overlayCanvas.height = annotCanvas.height;
    overlayCtx = overlayCanvas.getContext('2d');

    // 从原图裁剪选区到 base
    const tmpC = document.createElement('canvas');
    tmpC.width = capturedImage.width;
    tmpC.height = capturedImage.height;
    tmpC.getContext('2d').drawImage(capturedImage, 0, 0);
    const imgData = tmpC.getContext('2d').getImageData(x, y, w, h);
    baseCtx.putImageData(imgData, 0, 0);

    // 初始渲染
    annotCtx.drawImage(baseCanvas, 0, 0);

    scaleX = annotCanvas.width / annotCanvas.offsetWidth;
    scaleY = annotCanvas.height / annotCanvas.offsetHeight;

    annotCanvas.onmousedown = onAnnotDown;
    annotCanvas.onmousemove = onAnnotMove;
    annotCanvas.onmouseup   = onAnnotUp;
    annotCanvas.onmouseleave= onAnnotUp;
    annotCanvas.ontouchstart = e => { const t = e.touches[0]; onAnnotDown({ clientX:t.clientX, clientY:t.clientY }); e.preventDefault(); };
    annotCanvas.ontouchmove  = e => { const t = e.touches[0]; onAnnotMove({ clientX:t.clientX, clientY:t.clientY }); e.preventDefault(); };
    annotCanvas.ontouchend   = onAnnotUp;

    // 初始化撤销栈
    undoStack = [];
    redoStack = [];
    pushUndo();
    updateUndoButtons();
  }

  // ═══ 撤销/重做：canvas 快照，封顶 30 ═══
  function pushUndo() {
    redoStack = [];
    const snap = document.createElement('canvas');
    snap.width = baseCanvas.width;
    snap.height = baseCanvas.height;
    snap.getContext('2d').drawImage(baseCanvas, 0, 0);
    undoStack.push(snap);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
  }

  function applyState(targetCanvas) {
    baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
    baseCtx.drawImage(targetCanvas, 0, 0);
    annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
    annotCtx.drawImage(baseCanvas, 0, 0);
  }

  function undo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    applyState(undoStack[undoStack.length - 1]);
    updateUndoButtons();
  }

  function redo() {
    if (!redoStack.length) return;
    const snap = redoStack.pop();
    undoStack.push(snap);
    applyState(snap);
    updateUndoButtons();
  }

  function updateUndoButtons() {
    const ub = document.getElementById('undoBtn');
    const rb = document.getElementById('redoBtn');
    if (ub) ub.style.opacity = undoStack.length > 1 ? '1' : '0.3';
    if (rb) rb.style.opacity = redoStack.length ? '1' : '0.3';
  }

  // ═══ 快捷键 ═══
  function onKeyDown(e) {
    if (phase === 'selecting') {
      if (e.key === 'Enter') { e.preventDefault(); confirmSelection(); }
      if (e.key === 'Escape') { e.preventDefault(); exit(); }
    }
    if (phase === 'annotating') {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if (e.key === 'Escape') { e.preventDefault(); exit(); }
      // 数字键快速切工具: 1-6
      const tools = ['rect','arrow','text','pen','blur','crop'];
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < tools.length && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.querySelector('[data-tool="' + tools[idx] + '"]').click();
      }
    }
  }

  // ═══ 标注绘制 ═══
  function getAnnotPos(e) {
    const r = annotCanvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  }

  function onAnnotDown(e) {
    const p = getAnnotPos(e);

    // 文字工具：弹出浮层输入
    if (currentTool === 'text') {
      showTextInput(p);
      return;
    }

    if (currentTool === 'crop') { startCrop(p); return; }

    isDrawing = true;
    drawStartX = p.x; drawStartY = p.y;

    // 画笔：初始化点集
    if (currentTool === 'pen') {
      penPoints = [{ x: p.x, y: p.y }];
    }
  }

  function onAnnotMove(e) {
    const p = getAnnotPos(e);
    if (isCropping) { moveCrop(p); return; }
    if (!isDrawing) return;

    if (currentTool === 'pen') {
      penPoints.push({ x: p.x, y: p.y });
      drawPenOverlay();
    } else {
      drawOverlay(p);
    }
  }

  function onAnnotUp(e) {
    if (isCropping) { endCrop(); return; }
    if (!isDrawing) return;
    isDrawing = false;

    // 将 overlay 合成到底层
    if (currentTool === 'pen') {
      drawPenFinal();
    } else {
      drawShapeFinal(drawStartX, drawStartY,
        (e ? getAnnotPos(e).x : drawStartX),
        (e ? getAnnotPos(e).y : drawStartY));
    }

    penPoints = [];
    pushUndo();
    updateUndoButtons();
  }

  // ── Overlay（实时预览，只画 overlay 层） ──
  function drawOverlay(p) {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    drawOnCtx(overlayCtx, drawStartX, drawStartY, p.x, p.y);
    annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
    annotCtx.drawImage(baseCanvas, 0, 0);
    annotCtx.drawImage(overlayCanvas, 0, 0);
  }

  function drawPenOverlay() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    drawPenOnCtx(overlayCtx, penPoints);
    annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
    annotCtx.drawImage(baseCanvas, 0, 0);
    annotCtx.drawImage(overlayCanvas, 0, 0);
  }

  // ── Final（合成到底层） ──
  function drawShapeFinal(x1, y1, x2, y2) {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    drawOnCtx(baseCtx, x1, y1, x2, y2);
    annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
    annotCtx.drawImage(baseCanvas, 0, 0);
  }

  function drawPenFinal() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    drawPenOnCtx(baseCtx, penPoints);
    annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
    annotCtx.drawImage(baseCanvas, 0, 0);
  }

  // ── 通用绘制（任意 ctx） ──
  function drawOnCtx(ctx, x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (currentTool) {
      case 'rect':
        const rx = Math.min(x1,x2), ry = Math.min(y1,y2);
        const rw = Math.abs(x2-x1), rh = Math.abs(y2-y1);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.globalAlpha = 0.12;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.globalAlpha = 1;
        break;
      case 'arrow':
        const angle = Math.atan2(y2-y1, x2-x1);
        const hl = Math.min(18, Math.hypot(x2-x1, y2-y1)/3);
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2,y2);
        ctx.lineTo(x2 - hl*Math.cos(angle-0.4), y2 - hl*Math.sin(angle-0.4));
        ctx.lineTo(x2 - hl*Math.cos(angle+0.4), y2 - hl*Math.sin(angle+0.4));
        ctx.closePath(); ctx.fill();
        break;
      case 'blur':
        const bx=Math.min(x1,x2), by=Math.min(y1,y2);
        const bw=Math.abs(x2-x1), bh=Math.abs(y2-y1);
        if (bw<5||bh<5) break;
        // 从 base 取当前画面做像素化
        const tmp = document.createElement('canvas');
        tmp.width = Math.ceil(bw); tmp.height = Math.ceil(bh);
        const tctx = tmp.getContext('2d');
        tctx.drawImage(baseCanvas, bx, by, bw, bh, 0, 0, Math.ceil(bw/10), Math.ceil(bh/10));
        tctx.imageSmoothingEnabled = false;
        tctx.drawImage(tmp, 0, 0, Math.ceil(bw/10), Math.ceil(bh/10), 0, 0, Math.ceil(bw), Math.ceil(bh));
        ctx.drawImage(tmp, bx, by);
        break;
    }
    ctx.restore();
  }

  function drawPenOnCtx(ctx, pts) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── 文字浮层输入 ──
  function showTextInput(pos) {
    removeTextInput();

    const el = document.createElement('div');
    el.id = 'ssTextInput';
    const fontSize = currentSize * 7;

    // 计算 canvas 在页面中的偏移
    const canvasRect = annotCanvas.getBoundingClientRect();
    const pageX = canvasRect.left + pos.x / scaleX;
    const pageY = canvasRect.top + pos.y / scaleY;

    el.style.cssText = [
      'position:fixed',
      'z-index:10000',
      'left:' + pageX + 'px',
      'top:' + pageY + 'px',
      'background:var(--bg-secondary)',
      'border:2px solid ' + currentColor,
      'border-radius:8px',
      'padding:6px',
      'box-shadow:0 4px 16px rgba(0,0,0,0.15)',
      'display:flex',
      'align-items:center',
      'gap:4px',
    ].join(';');

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '输入文字…';
    input.style.cssText = [
      'border:none',
      'background:transparent',
      'outline:none',
      'font-size:' + fontSize + 'px',
      'font-family:sans-serif',
      'color:' + currentColor,
      'min-width:120px',
      'padding:4px 8px',
    ].join(';');

    const confirmBtn = document.createElement('button');
    confirmBtn.innerHTML = '✓';
    confirmBtn.style.cssText = [
      'width:30px;height:30px;border-radius:50%;border:none',
      'background:' + currentColor + ';color:#fff',
      'font-size:16px;cursor:pointer;font-weight:bold',
      'display:flex;align-items:center;justify-content:center',
    ].join(';');

    el.appendChild(input);
    el.appendChild(confirmBtn);
    document.body.appendChild(el);
    textInputEl = el;

    setTimeout(() => input.focus(), 50);

    function commit() {
      const text = input.value.trim();
      if (text) {
        baseCtx.save();
        baseCtx.font = fontSize + 'px sans-serif';
        baseCtx.fillStyle = currentColor;
        baseCtx.fillText(text, pos.x, pos.y);
        baseCtx.restore();
        annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
        annotCtx.drawImage(baseCanvas, 0, 0);
        pushUndo();
        updateUndoButtons();
      }
      removeTextInput();
    }

    confirmBtn.addEventListener('click', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); removeTextInput(); }
    });
    input.addEventListener('blur', () => {
      // 延迟一下，让按钮点击事件先触发
      setTimeout(() => { if (textInputEl === el) commit(); }, 150);
    });

    // 点击页面其他区域也关闭
    const onClickOutside = (e) => {
      if (!el.contains(e.target)) { commit(); document.removeEventListener('click', onClickOutside); }
    };
    setTimeout(() => document.addEventListener('click', onClickOutside), 100);
  }

  function removeTextInput() {
    if (textInputEl) { textInputEl.remove(); textInputEl = null; }
  }

  // ═══ 裁剪工具 ═══
  function startCrop(p) {
    cropX1 = p.x; cropY1 = p.y;
    cropX2 = p.x; cropY2 = p.y;
    isCropping = true;
  }

  function moveCrop(p) {
    cropX2 = p.x; cropY2 = p.y;
    // 实时预览裁剪框
    annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
    annotCtx.drawImage(baseCanvas, 0, 0);
    annotCtx.strokeStyle = '#007AFF';
    annotCtx.lineWidth = 2;
    annotCtx.setLineDash([6, 4]);
    annotCtx.strokeRect(
      Math.min(cropX1, cropX2), Math.min(cropY1, cropY2),
      Math.abs(cropX2 - cropX1), Math.abs(cropY2 - cropY1)
    );
    annotCtx.setLineDash([]);
  }

  function endCrop() {
    if (!isCropping) return;
    isCropping = false;
    const x = Math.min(cropX1, cropX2), y = Math.min(cropY1, cropY2);
    const w = Math.abs(cropX2 - cropX1), h = Math.abs(cropY2 - cropY1);
    if (w < 5 || h < 5) return;

    // 裁剪 base
    const tmpC = document.createElement('canvas');
    tmpC.width = Math.round(w);
    tmpC.height = Math.round(h);
    tmpC.getContext('2d').drawImage(baseCanvas, x, y, w, h, 0, 0, Math.round(w), Math.round(h));

    baseCanvas.width = Math.round(w);
    baseCanvas.height = Math.round(h);
    baseCtx.drawImage(tmpC, 0, 0);

    overlayCanvas.width = baseCanvas.width;
    overlayCanvas.height = baseCanvas.height;
    overlayCtx = overlayCanvas.getContext('2d');

    annotCanvas.width = baseCanvas.width;
    annotCanvas.height = baseCanvas.height;
    annotCtx.drawImage(baseCanvas, 0, 0);

    scaleX = annotCanvas.width / annotCanvas.offsetWidth;
    scaleY = annotCanvas.height / annotCanvas.offsetHeight;

    undoStack = [];
    redoStack = [];
    pushUndo();
    updateUndoButtons();

    // 自动切回矩形工具
    document.querySelector('[data-tool="rect"]').click();
  }

  // ═══ 工具切换 ═══
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
    });
  });

  document.getElementById('colorInput').addEventListener('input', function() {
    currentColor = this.value;
    document.getElementById('colorPicker').style.background = this.value;
  });

  document.querySelectorAll('[data-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-size]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSize = parseInt(btn.dataset.size);
    });
  });

  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);

  // ═══ 下载 / 复制 / 取消 ═══
  document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'screenshot_' + new Date().toISOString().slice(0,19).replace(/[:-]/g,'') + '.png';
    link.href = annotCanvas.toDataURL('image/png');
    link.click();
    toast('下载完成');
  });

  document.getElementById('copyBtn').addEventListener('click', async () => {
    const btn = document.getElementById('copyBtn');
    try {
      const blob = await new Promise(r => annotCanvas.toBlob(r, 'image/png'));
      if (!blob) throw new Error('toBlob failed');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      btn.innerHTML = '<i class="fas fa-check"></i> 已复制';
      setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> 复制'; }, 2000);
    } catch(e) {
      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 复制失败';
      toast('复制失败，请尝试使用下载按钮');
      setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> 复制'; }, 2000);
    }
  });

  document.getElementById('cancelBtn').addEventListener('click', exit);
  if (navigator.clipboard && navigator.clipboard.write) {
    document.getElementById('copyBtn').style.display = '';
  }

  function exit() {
    removeTextInput();
    phase = 'idle';
    isSelecting = false;
    isCropping = false;
    isDrawing = false;
    penPoints = [];
    undoStack = [];
    redoStack = [];
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    startScreen.style.display = '';
    stageSelect.style.display = 'none';
    stageAnnot.style.display = 'none';
    toolbar.classList.remove('active');
    bottom.classList.remove('active');
    document.removeEventListener('keydown', onKeyDown);
  }

})();
