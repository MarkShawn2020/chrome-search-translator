import { setupTranslator } from '@/utils/setup-translator';

import './style.scss';

// 初始化
function init() {
    // 确保DOM已完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupTranslator);
    } else {
        setupTranslator();
    }

    // 监听URL变化（Google使用History API进行页面导航）
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(setupTranslator, 500); // 页面变化后延迟执行
        }
    }).observe(document, { subtree: true, childList: true });
}

console.log('Google Search Translator initialized');
init();
