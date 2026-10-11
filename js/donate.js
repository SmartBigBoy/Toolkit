/**
 * 页脚「支持作者」— 微信赞赏码弹窗
 *
 * 触发元素：任何带 .donate-trigger 的元素（全站 footer 已内置一个按钮）
 * 图片路径：assets/wechat-donate.jpg，按脚本自身位置推断，根目录与 tools/ 子目录通用
 */
(function () {
    'use strict';

    var script = document.currentScript;
    var base = script ? script.src.replace(/js\/donate\.js.*$/, '') : './';
    var IMG_SRC = base + 'assets/wechat-donate.jpg';

    var modal = null;

    function buildModal() {
        var el = document.createElement('div');
        el.className = 'donate-modal';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-label', '微信赞赏');
        el.innerHTML =
            '<div class="donate-modal__box">' +
                '<h3>支持作者</h3>' +
                '<p>全部工具永久免费，如果帮到了你，欢迎扫码赞赏 ☕</p>' +
                '<img src="' + IMG_SRC + '" alt="微信赞赏码" width="320" height="181" loading="lazy">' +
                '<button type="button" class="donate-modal__close">关闭</button>' +
            '</div>';

        el.addEventListener('click', function (e) {
            if (e.target === el || e.target.classList.contains('donate-modal__close')) {
                close();
            }
        });

        document.body.appendChild(el);
        return el;
    }

    function open() {
        if (!modal) modal = buildModal();
        modal.classList.add('is-open');
        document.body.classList.add('donate-open');
        var btn = modal.querySelector('.donate-modal__close');
        if (btn) btn.focus();
    }

    function close() {
        if (!modal) return;
        modal.classList.remove('is-open');
        document.body.classList.remove('donate-open');
    }

    // 事件委托：footer 里的按钮（以及后续动态插入的）都能触发
    document.addEventListener('click', function (e) {
        var trigger = e.target.closest ? e.target.closest('.donate-trigger') : null;
        if (trigger) {
            e.preventDefault();
            open();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) close();
    });
})();
