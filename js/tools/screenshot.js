(function() {
  // ── 状态 ──
  let phase = 'idle'; // idle | selecting | annotating
  let stream = null;
  let capturedImage = null; // Image 对象
  let canvas, ctx;
  let selStartX, selStartY, selEndX, selEndY;
  let isSelecting = false;
  let scaleX = 1, scaleY = 1;
  let annotHistory = [];
  let annotIdx = -1;
  let currentTool = 'rect';
  let currentColor = '#e74c3c';
  let currentSize = 4;
  let isDrawing = false;
  let drawStartX, drawStartY;
  let imageData = null; // canvas image data for undo

  // ── DOM ──
  const container = document.getElementById('ssContainer');
  const startScreen = document.getElementById('startScreen');
  const stageSelect = document.getElementById('stageSelect');
  const stageAnnot = document.getElementById('stageAnnot');
  const captureCanvas = document.getElementById('captureCanvas');
  const annotCanvas = document.getElementById('annotCanvas');
  const toolbar = document.getElementById('annotToolbar');
  const bottom = document.getElementById('annotBottom');
  const cropInfo = document.getElementById('cropInfo');
  const previewImg = document.getElementById('previewImg');

  // ── 开始截图 ──
  document.getElementById('btnStartCapture').addEventListener('click', startCapture);

  async function startCapture() {
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // 截取一帧
      const c = document.createElement('canvas');
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      c.getContext('2d').drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      stream = null;

      // 加载到 Image
      capturedImage = new Image();
      capturedImage.onload = enterSelection;
      capturedImage.src = c.toDataURL('image/png');
    } catch(e) { if (e.name !== 'NotAllowedError') console.error(e); }
  }

  // ── 选区阶段 ──
  function enterSelection() {
    startScreen.style.display = 'none';
    stageSelect.style.display = 'block';
    phase = 'selecting';

    canvas = captureCanvas;
    ctx = canvas.getContext('2d');
    canvas.width = capturedImage.width;
    canvas.height = capturedImage.height;
    ctx.drawImage(capturedImage, 0, 0);

    scaleX = canvas.width / canvas.offsetWidth;
    scaleY = canvas.height / canvas.offsetHeight;

    // 鼠标事件
    canvas.onmousedown = onSelDown;
    canvas.onmousemove = onSelMove;
    canvas.onmouseup = onSelUp;
    canvas.onmouseleave = onSelUp;

    // 触屏
    canvas.ontouchstart = (e) => { const t = e.touches[0]; onSelDown({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() }); e.preventDefault(); };
    canvas.ontouchmove = (e) => { const t = e.touches[0]; onSelMove({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() }); e.preventDefault(); };
    canvas.ontouchend = onSelUp;

    document.addEventListener('keydown', onKeyDown);

    cropInfo.textContent = '拖拽选择截图区域，按 Enter 确认，Esc 取消';
  }

  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  }

  function onSelDown(e) {
    const p = getPos(e);
    selStartX = p.x; selStartY = p.y;
    selEndX = p.x; selEndY = p.y;
    isSelecting = true;
  }

  function onSelMove(e) {
    if (!isSelecting) return;
    const p = getPos(e);
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
    ctx.drawImage(capturedImage, 0, 0);
    // 暗色遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 挖出选区
    const x = Math.min(selStartX, selEndX), y = Math.min(selStartY, selEndY);
    const w = Math.abs(selEndX - selStartX), h = Math.abs(selEndY - selStartY);
    ctx.drawImage(capturedImage, x, y, w, h, x, y, w, h);
    // 选区边框
    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    // 尺寸标注
    ctx.fillStyle = '#007AFF';
    ctx.font = '13px sans-serif';
    ctx.fillText(Math.round(w) + ' × ' + Math.round(h), x + 6, y - 8);
  }

  // ── 确认选区 → 进入标注 ──
  function confirmSelection() {
    const x = Math.min(selStartX, selEndX), y = Math.min(selStartY, selEndY);
    const w = Math.abs(selEndX - selStartX), h = Math.abs(selEndY - selStartY);
    if (w < 5 || h < 5) return;

    stageSelect.style.display = 'none';
    stageAnnot.style.display = 'block';
    toolbar.classList.add('active');
    bottom.classList.add('active');
    phase = 'annotating';

    canvas = annotCanvas;
    ctx = canvas.getContext('2d');
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);

    // 从原图截取选区
    const tmpC = document.createElement('canvas');
    tmpC.width = capturedImage.width;
    tmpC.height = capturedImage.height;
    tmpC.getContext('2d').drawImage(capturedImage, 0, 0);
    const imgData = tmpC.getContext('2d').getImageData(x, y, w, h);
    ctx.putImageData(imgData, 0, 0);

    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    scaleX = canvas.width / canvas.offsetWidth;
    scaleY = canvas.height / canvas.offsetHeight;

    // 鼠标事件
    canvas.onmousedown = onAnnotDown;
    canvas.onmousemove = onAnnotMove;
    canvas.onmouseup = onAnnotUp;
    canvas.onmouseleave = onAnnotUp;
    canvas.ontouchstart = (e) => { const t = e.touches[0]; onAnnotDown({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() }); e.preventDefault(); };
    canvas.ontouchmove = (e) => { const t = e.touches[0]; onAnnotMove({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() }); e.preventDefault(); };
    canvas.ontouchend = onAnnotUp;

    saveSnapshot();
    updateUndoButtons();
  }

  // ── 快捷键 ──
  function onKeyDown(e) {
    if (phase === 'selecting') {
      if (e.key === 'Enter') { e.preventDefault(); confirmSelection(); }
      if (e.key === 'Escape') { e.preventDefault(); exit(); }
    }
    if (phase === 'annotating') {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if (e.key === 'Escape') { e.preventDefault(); exit(); }
    }
  }

  // ── 标注绘制 ──
  function getAnnotPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  }

  function onAnnotDown(e) {
    const p = getAnnotPos(e);
    if (currentTool === 'crop') { startCrop(p); return; }
    isDrawing = true;
    drawStartX = p.x; drawStartY = p.y;
  }

  function onAnnotMove(e) {
    const p = getAnnotPos(e);
    if (isCropping) { moveCrop(p); return; }
    if (!isDrawing) return;
    restoreSnapshot();
    drawShape(drawStartX, drawStartY, p.x, p.y, false);
  }

  function onAnnotUp(e) {
    if (isCropping) { endCrop(); return; }
    if (!isDrawing) return;
    isDrawing = false;
    saveSnapshot();
    updateUndoButtons();
  }

  function drawShape(x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = currentColor; ctx.fillStyle = currentColor;
    ctx.lineWidth = currentSize; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (currentTool) {
      case 'rect':
        const rx=Math.min(x1,x2), ry=Math.min(y1,y2), rw=Math.abs(x2-x1), rh=Math.abs(y2-y1);
        ctx.strokeRect(rx,ry,rw,rh);
        ctx.globalAlpha=0.12; ctx.fillRect(rx,ry,rw,rh); ctx.globalAlpha=1;
        break;
      case 'arrow':
        const angle=Math.atan2(y2-y1,x2-x1), hl=Math.min(18,Math.hypot(x2-x1,y2-y1)/3);
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2,y2);
        ctx.lineTo(x2-hl*Math.cos(angle-0.4),y2-hl*Math.sin(angle-0.4));
        ctx.lineTo(x2-hl*Math.cos(angle+0.4),y2-hl*Math.sin(angle+0.4));
        ctx.closePath(); ctx.fill();
        break;
      case 'text':
        ctx.font=(currentSize*7)+'px sans-serif';
        ctx.fillText('T', x1, y1);
        break;
      case 'pen':
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        break;
      case 'blur':
        const bx=Math.min(x1,x2), by=Math.min(y1,y2), bw=Math.abs(x2-x1), bh=Math.abs(y2-y1);
        if (bw<5||bh<5) break;
        const bc=document.createElement('canvas'); bc.width=Math.ceil(bw); bc.height=Math.ceil(bh);
        const bctx=bc.getContext('2d');
        bctx.drawImage(canvas,bx,by,bw,bh,0,0,Math.ceil(bw/10),Math.ceil(bh/10));
        bctx.imageSmoothingEnabled=false;
        bctx.drawImage(bc,0,0,Math.ceil(bw/10),Math.ceil(bh/10),0,0,Math.ceil(bw),Math.ceil(bh));
        ctx.drawImage(bc,bx,by);
        break;
    }
    ctx.restore();
  }

  // ── 裁剪（标注阶段内的裁剪） ──
  let cropX1,cropY1,cropX2,cropY2,isCropping=false;

  function startCrop(p) { cropX1=p.x; cropY1=p.y; cropX2=p.x; cropY2=p.y; isCropping=true; }
  function moveCrop(p) { cropX2=p.x; cropY2=p.y; restoreSnapshot(); ctx.strokeStyle='#007AFF'; ctx.lineWidth=2; ctx.setLineDash([6,4]); ctx.strokeRect(Math.min(cropX1,cropX2),Math.min(cropY1,cropY2),Math.abs(cropX2-cropX1),Math.abs(cropY2-cropY1)); ctx.setLineDash([]); }
  function endCrop() {
    if (!isCropping) return; isCropping=false;
    const x=Math.min(cropX1,cropX2), y=Math.min(cropY1,cropY2), w=Math.abs(cropX2-cropX1), h=Math.abs(cropY2-cropY1);
    if (w<5||h<5) return;
    const d=ctx.getImageData(x,y,w,h);
    canvas.width=Math.round(w); canvas.height=Math.round(h);
    ctx.putImageData(d,0,0);
    imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
    scaleX=canvas.width/canvas.offsetWidth; scaleY=canvas.height/canvas.offsetHeight;
    saveSnapshot(); updateUndoButtons();
    document.querySelector('[data-tool="rect"]').click();
  }

  // ── 撤销 ──
  function saveSnapshot() {
    annotHistory = annotHistory.slice(0, annotIdx + 1);
    annotHistory.push({ snapshot: ctx.getImageData(0,0,canvas.width,canvas.height) });
    annotIdx = annotHistory.length - 1;
  }
  function restoreSnapshot() { if (annotIdx>=0) ctx.putImageData(annotHistory[annotIdx].snapshot,0,0); else if (imageData) ctx.putImageData(imageData,0,0); }
  function undo() { if (annotIdx<=0) return; annotIdx--; restoreSnapshot(); updateUndoButtons(); }
  function redo() { if (annotIdx>=annotHistory.length-1) return; annotIdx++; restoreSnapshot(); updateUndoButtons(); }
  function updateUndoButtons() { document.getElementById('undoBtn').style.opacity=annotIdx>0?'1':'0.3'; document.getElementById('redoBtn').style.opacity=annotIdx<annotHistory.length-1?'1':'0.3'; }

  // ── 工具切换 ──
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
      canvas.style.cursor = currentTool==='crop'?'crosshair':'crosshair';
    });
  });
  document.getElementById('colorInput').addEventListener('input', function() { currentColor=this.value; document.getElementById('colorPicker').style.background=this.value; });
  document.querySelectorAll('[data-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-size]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); currentSize=parseInt(btn.dataset.size);
    });
  });
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);

  // ── 下载 / 复制 / 取消 ──
  document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'screenshot_'+new Date().toISOString().slice(0,19).replace(/[:-]/g,'')+'.png';
    link.href = annotCanvas.toDataURL('image/png'); link.click();
  });
  document.getElementById('copyBtn').addEventListener('click', async () => {
    try { const blob=await new Promise(r=>annotCanvas.toBlob(r,'image/png')); await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]); document.getElementById('copyBtn').textContent='已复制'; setTimeout(()=>document.getElementById('copyBtn').innerHTML='<i class="fas fa-copy"></i> 复制',2000); } catch(e){}
  });
  document.getElementById('cancelBtn').addEventListener('click', exit);
  if (navigator.clipboard && navigator.clipboard.write) document.getElementById('copyBtn').style.display='';

  function exit() {
    phase='idle'; isSelecting=false; isCropping=false; isDrawing=false;
    if (stream) { stream.getTracks().forEach(t=>t.stop()); stream=null; }
    startScreen.style.display=''; stageSelect.style.display='none'; stageAnnot.style.display='none';
    toolbar.classList.remove('active'); bottom.classList.remove('active');
    document.removeEventListener('keydown', onKeyDown);
  }
})();
