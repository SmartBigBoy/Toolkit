/* 工具列表数据 - 所有工具页共用 */
const TOOLS_DATA = [
  { id: 'json',       name: 'JSON格式化', icon: 'fa-file-code',    cat: 'dev' },
  { id: 'timestamp',  name: '时间戳转换', icon: 'fa-clock',        cat: 'dev' },
  { id: 'base64',     name: 'Base64编码', icon: 'fa-key',          cat: 'dev' },
  { id: 'url',        name: 'URL编码',    icon: 'fa-link',         cat: 'dev' },
  { id: 'text',       name: '文本处理',   icon: 'fa-align-left',   cat: 'text' },
  { id: 'hash',       name: '哈希计算',   icon: 'fa-shield-alt',   cat: 'dev' },
  { id: 'password',   name: '密码生成',   icon: 'fa-lock',         cat: 'dev' },
  { id: 'qrcode',     name: '二维码生成', icon: 'fa-qrcode',       cat: 'image' },
  { id: 'color',      name: '颜色转换',   icon: 'fa-palette',      cat: 'image' },
  { id: 'unit',       name: '单位换算',   icon: 'fa-ruler',        cat: 'calc' },
  { id: 'convert',    name: '进制转换',   icon: 'fa-calculator',   cat: 'calc' },
  { id: 'math',       name: '数学计算',   icon: 'fa-square-root-alt', cat: 'calc' },
  { id: 'currency',   name: '汇率换算',   icon: 'fa-coins',        cat: 'calc' },
  { id: 'photo',      name: '证件照转换', icon: 'fa-camera',       cat: 'image' },
  { id: 'train',      name: '高铁到站',   icon: 'fa-train',         cat: 'fun' },
  { id: 'alipay',     name: '支付宝到账', icon: 'fa-bell',          cat: 'fun' },
  { id: 'mbti',       name: 'MBTI测试',   icon: 'fa-brain',         cat: 'fun' },
  { id: 'ip',         name: 'IP查询',     icon: 'fa-network-wired', cat: 'dev' },
  { id: 'date',       name: '日期计算',   icon: 'fa-calendar-alt',  cat: 'calc' },
  { id: 'screenshot', name: '截图工具',   icon: 'fa-camera',       cat: 'image' },
  { id: 'timer',      name: '定时器',     icon: 'fa-hourglass-half', cat: 'calc' },
  { id: 'compress',   name: '图片压缩',   icon: 'fa-compress-alt', cat: 'image' },
  { id: 'scan',       name: '文稿扫描',   icon: 'fa-file-alt',     cat: 'image' },
];

/* Fisher-Yates 洗牌 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* 获取当前页面 ID */
function getCurrentToolId() {
  const path = window.location.pathname;
  const m = path.match(/tools\/(\w+)\.html/);
  return m ? m[1] : null;
}

/* ── 优雅交叉淡入淡出 ── */
let carouselTimer = null;
let isAnimating = false;

function getContainer() {
  return document.getElementById('tool-recommend');
}

function renderCards(cards) {
  const c = getContainer();
  if (!c) return null;
  c.innerHTML = cards.map(t => `
    <a href="../tools/${t.id}.html" class="rec-card">
      <div class="rec-icon"><i class="fas ${t.icon}"></i></div>
      <span class="rec-name">${t.name}</span>
    </a>
  `).join('');
  return c;
}

function crossfade() {
  if (isAnimating) return;
  const currentId = getCurrentToolId();
  const others = TOOLS_DATA.filter(t => t.id !== currentId);
  const container = getContainer();
  if (!container) return;

  isAnimating = true;
  // 旧卡片淡出 + 上移
  container.classList.add('rec-fade-out');

  setTimeout(() => {
    shuffle(others);
    const picks = others.slice(0, 5);
    renderCards(picks);
    // 新卡片从下方淡入
    container.classList.remove('rec-fade-out');
    container.classList.add('rec-fade-in');
    setTimeout(() => {
      container.classList.remove('rec-fade-in');
      isAnimating = false;
    }, 700);
  }, 500);
}

function startCarousel() {
  const currentId = getCurrentToolId();
  const others = TOOLS_DATA.filter(t => t.id !== currentId);
  shuffle(others);
  renderCards(others.slice(0, 5));
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(crossfade, 5000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startCarousel);
} else {
  startCarousel();
}
