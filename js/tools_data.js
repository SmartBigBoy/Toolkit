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

/* ── 轮播状态 ── */
let carouselCards = [];   // 当前 5 张卡片
let carouselIdx = 0;      // 下一张要替换的位置
let carouselTimer = null;
let isAnimating = false;

/* 渲染卡片（无动画） */
function renderCarousel(cards) {
  const container = document.getElementById('tool-recommend');
  if (!container) return;
  container.innerHTML = cards.map(t => `
    <a href="../tools/${t.id}.html" class="rec-card">
      <div class="rec-icon"><i class="fas ${t.icon}"></i></div>
      <span class="rec-name">${t.name}</span>
    </a>
  `).join('');
}

/* 初始化轮播 */
function initCarousel() {
  const currentId = getCurrentToolId();
  const others = TOOLS_DATA.filter(t => t.id !== currentId);
  shuffle(others);
  carouselCards = others.slice(0, 5);
  carouselIdx = 0;
  renderCarousel(carouselCards);
}

/* 单张轮播 — 替换一张卡片，带滑入动画 */
function rotateOneCard() {
  if (isAnimating) return;
  const currentId = getCurrentToolId();
  const others = TOOLS_DATA.filter(t => t.id !== currentId);
  const shown = new Set(carouselCards.map(t => t.id));
  const available = others.filter(t => !shown.has(t.id));
  if (available.length === 0) return;

  const newCard = available[Math.floor(Math.random() * available.length)];
  const container = document.getElementById('tool-recommend');
  if (!container) return;

  // 找到要替换的卡片元素
  const cards = container.querySelectorAll('.rec-card');
  const target = cards[carouselIdx];
  if (!target) return;

  isAnimating = true;
  target.classList.add('rec-slide-out');

  setTimeout(() => {
    carouselCards[carouselIdx] = newCard;
    renderCarousel(carouselCards);
    // 对新替换的卡片应用滑入动画
    const newCards = container.querySelectorAll('.rec-card');
    const newTarget = newCards[carouselIdx];
    if (newTarget) newTarget.classList.add('rec-slide-in');
    carouselIdx = (carouselIdx + 1) % 5;
    isAnimating = false;
  }, 300);
}

/* 启动 */
function startCarousel() {
  initCarousel();
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(rotateOneCard, 3000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startCarousel);
} else {
  startCarousel();
}
