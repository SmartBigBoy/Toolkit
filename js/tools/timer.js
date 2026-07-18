(function() {
  let mode = 'countdown'; // 'countdown' | 'stopwatch'
  let timerId = null;
  let isRunning = false;
  let totalMs = 5 * 60 * 1000; // countdown: remaining ms; stopwatch: elapsed ms
  let lapCount = 0;

  const display = document.getElementById('display');
  const btnStart = document.getElementById('btnStart');
  const btnLap = document.getElementById('btnLap');
  const btnReset = document.getElementById('btnReset');
  const tabCountdown = document.getElementById('tabCountdown');
  const tabStopwatch = document.getElementById('tabStopwatch');
  const timerStatus = document.getElementById('timerStatus');
  const lapList = document.getElementById('lapList');
  const countdownArea = document.getElementById('countdown-input-area');
  const stopwatchArea = document.getElementById('stopwatch-area');

  // ── 切换标签 ──
  tabCountdown.addEventListener('click', () => switchMode('countdown'));
  tabStopwatch.addEventListener('click', () => switchMode('stopwatch'));

  function switchMode(m) {
    if (isRunning) stop();
    mode = m;
    tabCountdown.classList.toggle('active', m === 'countdown');
    tabStopwatch.classList.toggle('active', m === 'stopwatch');
    countdownArea.classList.toggle('active', m === 'countdown');
    reset();
  }

  // ── 预设 ──
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isRunning) return;
      const h = parseInt(btn.dataset.h) || 0;
      const m = parseInt(btn.dataset.m) || 0;
      document.getElementById('inputHour').value = h;
      document.getElementById('inputMin').value = m;
      document.getElementById('inputSec').value = 0;
      updateDisplayFromInput();
    });
  });

  // ── 输入联动 ──
  ['inputHour', 'inputMin', 'inputSec'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      if (!isRunning) updateDisplayFromInput();
    });
  });

  function updateDisplayFromInput() {
    const h = parseInt(document.getElementById('inputHour').value) || 0;
    const m = parseInt(document.getElementById('inputMin').value) || 0;
    const s = parseInt(document.getElementById('inputSec').value) || 0;
    totalMs = ((h * 3600) + (m * 60) + s) * 1000;
    renderTime(totalMs);
  }

  // ── 按钮 ──
  btnStart.addEventListener('click', () => { isRunning ? pause() : start(); });
  btnLap.addEventListener('click', lap);
  btnReset.addEventListener('click', reset);

  // ── 核心 ──
  function start() {
    if (mode === 'countdown') {
      updateDisplayFromInput();
      if (totalMs <= 0) return;
    }
    isRunning = true;
    btnStart.innerHTML = '<i class="fas fa-pause"></i> 暂停';
    btnStart.classList.add('running');
    btnLap.removeAttribute('disabled');
    timerStatus.textContent = mode === 'countdown' ? '倒计时运行中' : '秒表运行中';
    const startTime = Date.now();
    const initialMs = totalMs;

    timerId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (mode === 'countdown') {
        totalMs = Math.max(0, initialMs - elapsed);
        renderTime(totalMs);
        document.title = formatTime(totalMs) + ' - 定时器';
        if (totalMs <= 0) { stop(); playBeep(); timerStatus.textContent = '⏰ 时间到！'; document.title = '时间到 - 定时器'; }
      } else {
        totalMs = elapsed;
        renderTime(totalMs);
        document.title = formatTime(totalMs) + ' - 秒表';
      }
    }, 100);
  }

  function pause() {
    stop();
    btnStart.innerHTML = '<i class="fas fa-play"></i> 继续';
    btnStart.classList.remove('running');
    timerStatus.textContent = '已暂停';
  }

  function stop() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (mode === 'countdown') document.title = '倒计时 - 在线工具箱';
    else document.title = '秒表 - 在线工具箱';
  }

  function reset() {
    stop();
    btnStart.innerHTML = '<i class="fas fa-play"></i> 开始';
    btnStart.classList.remove('running');
    btnLap.disabled = true;
    lapCount = 0;
    lapList.innerHTML = '';
    timerStatus.textContent = '';
    if (mode === 'countdown') { updateDisplayFromInput(); document.title = '倒计时 - 在线工具箱'; }
    else { totalMs = 0; renderTime(0); document.title = '秒表 - 在线工具箱'; }
  }

  function lap() {
    if (mode !== 'stopwatch' || !isRunning) return;
    lapCount++;
    const elapsed = formatTime(totalMs);
    const item = document.createElement('div');
    item.className = 'lap-item';
    item.innerHTML = '<span class="lap-num">计次 ' + lapCount + '</span><span>' + elapsed + '</span>';
    lapList.insertBefore(item, lapList.firstChild);
  }

  // ── 蜂鸣 ──
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc.start(); osc.stop(ctx.currentTime + 1);
      // 重复 3 次
      for (let i = 0; i < 3; i++) {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.frequency.value = 880; o2.type = 'sine';
        g2.gain.setValueAtTime(0.3, ctx.currentTime + i * 1.5);
        g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 1.5 + 0.8);
        o2.start(ctx.currentTime + i * 1.5); o2.stop(ctx.currentTime + i * 1.5 + 0.8);
      }
    } catch(e) {}
  }

  // ── 渲染 ──
  function renderTime(ms) {
    display.textContent = formatTime(ms);
  }

  function formatTime(ms) {
    const total = Math.round(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return (h > 0 ? String(h).padStart(2,'0') + ':' : '') + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  // ── 初始化 ──
  updateDisplayFromInput();
})();
