import logger from '@/utils/log';
import { setupTranslator } from '@/utils/setup-translator';

import './style.scss';

// 初始化翻译功能
function init() {
    logger.group('Google搜索翻译功能');
    logger.info('初始化翻译功能...');

    // 确保DOM已完全加载
    if (document.readyState === 'loading') {
        logger.debug('DOM尚未加载完成，注册DOMContentLoaded事件');
        document.addEventListener('DOMContentLoaded', () => {
            logger.info('DOM加载完成，开始设置翻译器');
            setupTranslator();
        });
    } else {
        logger.debug('DOM已加载完成，直接设置翻译器');
        setupTranslator();
    }

    // 监听URL变化（Google使用History API进行页面导航）
    logger.info('注册URL变化监听器');
    let lastUrl = location.href;

    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            const oldUrl = lastUrl;
            lastUrl = location.href;

            logger.info('检测到页面URL变化', {
                from: oldUrl,
                to: lastUrl,
            });

            logger.time('页面URL变化处理');
            setTimeout(() => {
                logger.debug('重新初始化翻译器');
                setupTranslator();
                logger.timeEnd('页面URL变化处理');
            }, 500); // 页面变化后延迟执行
        }
    }).observe(document, { subtree: true, childList: true });

    logger.info('Google搜索翻译功能初始化完成', {
        url: location.href,
        userAgent: navigator.userAgent,
    });
    logger.groupEnd();
}

// 启动应用
logger.info('🚀 Google Search Translator v0.0.5 启动');
logger.logFeature('翻译功能', '初始化');
init();
