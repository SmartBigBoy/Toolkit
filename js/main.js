document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const toolCards = document.querySelectorAll('.tool-card');

    // ── 使用频率跟踪 ──
    const FREQ_KEY = 'toolkit_freq';

    function getFreq() {
        try { return JSON.parse(localStorage.getItem(FREQ_KEY)) || {}; } catch { return {}; }
    }

    function recordUse(name) {
        const freq = getFreq();
        freq[name] = (freq[name] || 0) + 1;
        try { localStorage.setItem(FREQ_KEY, JSON.stringify(freq)); } catch {}
    }

    // ── 最近使用列表 ──
    const RECENT_KEY = 'toolkit_recent';
    const MAX_RECENT = 6;

    function getRecent() {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
    }

    function addRecent(name) {
        let recent = getRecent();
        recent = recent.filter(n => n !== name); // 去重
        recent.unshift(name);                     // 放最前
        if (recent.length > MAX_RECENT) recent.pop();
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch {}
    }

    // ── 渲染最近使用 ──
    function renderRecent() {
        const section = document.getElementById('recent-tools');
        const grid = document.getElementById('recent-grid');
        if (!section || !grid) return;

        const recent = getRecent();
        if (recent.length === 0) { section.style.display = 'none'; return; }

        // 建立 name → card HTML 的映射
        const cardMap = {};
        toolCards.forEach(card => {
            const name = card.dataset.name;
            cardMap[name] = card.cloneNode(true); // 克隆避免影响原卡片
        });

        grid.innerHTML = '';
        let count = 0;
        recent.forEach(name => {
            const clone = cardMap[name];
            if (!clone) return;
            if (count >= 6) return;
            // 修复克隆卡片的点击事件
            const a = clone.querySelector('a');
            if (a) {
                clone.addEventListener('click', (e) => {
                    if (!e.target.closest('a')) {
                        const link = clone.querySelector('a');
                        if (link) link.click();
                    }
                });
            }
            grid.appendChild(clone);
            count++;
        });

        section.style.display = count > 0 ? 'block' : 'none';
    }

    // ── 搜索 ──
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();

        toolCards.forEach(card => {
            const name = card.dataset.name.toLowerCase();
            const desc = card.dataset.desc.toLowerCase();
            card.style.display = (name.includes(keyword) || desc.includes(keyword)) ? 'block' : 'none';
        });

        // 最近使用区域也参与搜索过滤
        const recentGrid = document.getElementById('recent-grid');
        if (recentGrid) {
            const recentCards = recentGrid.querySelectorAll('.tool-card');
            let hasRecent = false;
            recentCards.forEach(card => {
                const name = card.dataset.name.toLowerCase();
                const desc = card.dataset.desc.toLowerCase();
                const match = name.includes(keyword) || desc.includes(keyword);
                card.style.display = match ? 'block' : 'none';
                if (match) hasRecent = true;
            });
            document.getElementById('recent-tools').style.display = hasRecent ? 'block' : 'none';
        }

        const sections = document.querySelectorAll('.category, .quick-tools');
        sections.forEach(section => {
            if (section.id === 'recent-tools') return; // 已处理
            const cardsInSection = section.querySelectorAll('.tool-card');
            const hasVisible = Array.from(cardsInSection).some(card => card.style.display === 'block');
            section.style.display = hasVisible ? 'block' : 'none';
        });
    });

    // ── 点击跟踪 ──
    toolCards.forEach(card => {
        card.addEventListener('click', () => {
            const name = card.dataset.name;
            if (name) { recordUse(name); addRecent(name); }
        });
    });

    // ── 页面加载动画（返回体验平滑化） ──
    document.body.classList.add('page-loaded');

    // ── 初始化 ──
    renderRecent();

    // ── 让返回时页面不缓存旧状态 ──
    // 部分浏览器 bfcache 会导致搜索状态残留
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            // 从 bfcache 恢复时重置搜索
            if (searchInput) searchInput.value = '';
            toolCards.forEach(card => card.style.display = 'block');
            renderRecent();
        }
    });
});