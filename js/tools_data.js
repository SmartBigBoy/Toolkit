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

/* 渲染推荐卡片 */
function renderRecommendations() {
  const currentId = getCurrentToolId();
  const others = TOOLS_DATA.filter(t => t.id !== currentId);
  shuffle(others);
  const picks = others.slice(0, 5);

  const container = document.getElementById('tool-recommend');
  if (!container) return;

  container.innerHTML = picks.map(t => `
    <a href="../tools/${t.id}.html" class="rec-card">
      <div class="rec-icon"><i class="fas ${t.icon}"></i></div>
      <span class="rec-name">${t.name}</span>
    </a>
  `).join('');
}

/* 6 秒轮播刷新 */
let recTimer = null;
function startRecRotation() {
  renderRecommendations();
  if (recTimer) clearInterval(recTimer);
  recTimer = setInterval(() => {
    renderRecommendations();
  }, 6000);
}

/* 页面加载时启动 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startRecRotation);
} else {
  startRecRotation();
}
