import { createRoot } from 'react-dom/client';

import TranslationItem from './components/TranslationItem';

import './style.scss';

// 日志级别
const LOG_LEVEL = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

// 日志函数
function log(level: number, ...args: any[]) {
    // 始终记录所有日志
    const prefix = [
        '[TRANSLATOR:DEBUG]',
        '[TRANSLATOR:INFO]',
        '[TRANSLATOR:WARN]',
        '[TRANSLATOR:ERROR]',
    ][level];

    // 根据日志级别使用不同的控制台函数
    switch (level) {
        case LOG_LEVEL.DEBUG:
            console.debug(prefix, ...args);
            break;
        case LOG_LEVEL.INFO:
            console.info(prefix, ...args);
            break;
        case LOG_LEVEL.WARN:
            console.warn(prefix, ...args);
            break;
        case LOG_LEVEL.ERROR:
            console.error(prefix, ...args);
            break;
        default:
            console.log(prefix, ...args);
    }
}

// 立即输出初始化日志，确认脚本已加载
console.log(
    '%c Google Search Translator 插件已加载 %c v0.0.2',
    'background: #4285F4; color: white; padding: 2px;',
    'background: #34A853; color: white; padding: 2px;',
);
log(LOG_LEVEL.INFO, '内容脚本已加载，开始初始化...');

// 默认配置
const DEFAULT_CONFIG = {
    enabled: true,
    sourceLanguage: 'zh-CN',
    targetLanguage: 'en',
};

// 获取用户配置
async function getConfig() {
    log(LOG_LEVEL.DEBUG, '获取用户配置...');
    return new Promise((resolve) => {
        chrome.storage.sync.get(['translatorConfig'], (result) => {
            const config = result.translatorConfig || DEFAULT_CONFIG;
            log(LOG_LEVEL.INFO, '获取到配置:', config);
            resolve(config);
        });
    });
}

// 翻译文本
async function translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
): Promise<string> {
    log(
        LOG_LEVEL.INFO,
        `开始翻译文本: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`,
        `从 ${sourceLang} 到 ${targetLang}`,
    );

    try {
        // 使用Google翻译API
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
            text,
        )}`;

        log(LOG_LEVEL.DEBUG, '发送翻译请求:', url);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        log(LOG_LEVEL.DEBUG, '收到翻译响应:', data);

        // 提取翻译后的文本
        if (data && data[0] && data[0][0]) {
            const translatedText = data[0][0][0];
            log(
                LOG_LEVEL.INFO,
                `翻译成功: "${translatedText.slice(0, 30)}${
                    translatedText.length > 30 ? '...' : ''
                }"`,
            );
            return translatedText;
        }

        log(LOG_LEVEL.WARN, '翻译API返回了意外格式的数据');
        return '';
    } catch (error) {
        log(LOG_LEVEL.ERROR, '翻译错误:', error);
        return '';
    }
}

// 翻转语言
function flipLanguages(sourceLang: string, targetLang: string) {
    return {
        sourceLanguage: targetLang,
        targetLanguage: sourceLang,
    };
}

// 监听Google搜索框输入
async function setupSearchBoxListener() {
    log(LOG_LEVEL.INFO, '设置搜索框监听器...');

    try {
        const config = (await getConfig()) as typeof DEFAULT_CONFIG;

        if (!config.enabled) {
            log(LOG_LEVEL.INFO, '翻译功能已被禁用，跳过初始化');
            return;
        }

        // 查找搜索框 - 尝试多种可能的选择器
        log(LOG_LEVEL.DEBUG, '查找Google搜索框元素...');

        // 寻找搜索框的几种可能方式
        let searchInput: HTMLInputElement | null = document.querySelector(
            'input[name="q"]',
        ) as HTMLInputElement;

        if (!searchInput) {
            searchInput = document.querySelector('input[title="搜索"]') as HTMLInputElement;
        }

        if (!searchInput) {
            searchInput = document.querySelector('input[title="Search"]') as HTMLInputElement;
        }

        if (!searchInput) {
            searchInput = document.querySelector(
                'input[type="text"][aria-autocomplete="both"]',
            ) as HTMLInputElement;
        }

        if (!searchInput) {
            log(LOG_LEVEL.ERROR, '无法找到Google搜索框，脚本将退出');
            // 在控制台显示当前页面的所有input元素，帮助调试
            const allInputs = document.querySelectorAll('input');
            log(LOG_LEVEL.DEBUG, `页面上的所有输入框(${allInputs.length}):`, [...allInputs]);
            return;
        }

        // 避免重复初始化
        if (searchInput.dataset.translatorInitialized === 'true') {
            log(LOG_LEVEL.INFO, '搜索框已初始化，跳过');
            return;
        }

        // 标记为已初始化
        searchInput.dataset.translatorInitialized = 'true';

        log(LOG_LEVEL.INFO, '找到搜索框元素:', searchInput);

        // 监听输入事件
        let lastInputValue = '';
        let translationTimeout: number | undefined;
        let translationContainer: HTMLElement | null = null;

        // 创建翻译结果容器
        function createTranslationContainer() {
            log(LOG_LEVEL.DEBUG, '创建翻译结果容器...');

            // 查找搜索表单 - 首先尝试最接近的form
            const searchForm = searchInput?.closest('form');
            if (!searchForm) {
                log(LOG_LEVEL.WARN, '无法找到搜索表单元素');

                // 尝试查找搜索框的父容器作为备选
                const parentContainer = searchInput?.parentElement?.parentElement;
                if (!parentContainer) {
                    log(LOG_LEVEL.ERROR, '无法找到合适的容器来插入翻译结果');
                    return null;
                }

                log(LOG_LEVEL.INFO, '使用搜索框的父容器作为备选');
                return createContainerInElement(parentContainer);
            }

            log(LOG_LEVEL.DEBUG, '找到搜索表单:', searchForm);
            return createContainerInElement(searchForm);

            // 辅助函数：在特定元素中创建容器
            function createContainerInElement(element: Element): HTMLElement | null {
                // 检查是否已存在
                const existingContainer = document.querySelector(
                    '#chrome-search-translator',
                ) as HTMLElement | null;
                if (existingContainer) {
                    log(LOG_LEVEL.DEBUG, '找到现有翻译容器，重用它');
                    return existingContainer;
                }

                // 创建新容器
                log(LOG_LEVEL.DEBUG, '创建新的翻译容器元素');
                const container = document.createElement('div');
                container.id = 'chrome-search-translator';
                container.className = 'chrome-search-translator-container';

                // 查找可能的插入位置 - 尝试几种常见选择器
                // 首先尝试搜索建议列表
                const suggestionSelectors = [
                    'ul[role="listbox"]', // 标准搜索建议
                    '.UUbT9', // 常见的Google搜索建议容器类
                    '.aajZCb', // 另一个可能的容器类
                    '.erkvQe', // 另一个可能的容器类
                    '.mkHrUc', // 可能的移动版搜索建议容器
                ];

                let inserted = false;
                for (const selector of suggestionSelectors) {
                    const suggestionsList = document.querySelector(selector);
                    if (suggestionsList) {
                        log(LOG_LEVEL.INFO, `找到搜索建议列表: ${selector}，插入翻译容器`);
                        suggestionsList.parentNode?.insertBefore(container, suggestionsList);
                        inserted = true;
                        break;
                    }
                }

                // 如果找不到建议列表，则附加到表单或父元素
                if (!inserted) {
                    log(LOG_LEVEL.INFO, '未找到搜索建议列表，将翻译容器附加到父元素');
                    element.append(container);
                }

                return container;
            }
        }

        // 更新或创建翻译容器
        function updateTranslationContainer(translatedText: string, originalText: string) {
            log(LOG_LEVEL.DEBUG, '更新翻译容器内容...');

            try {
                // 获取或创建容器
                if (!translationContainer) {
                    log(LOG_LEVEL.DEBUG, '翻译容器不存在，创建新容器');
                    translationContainer = createTranslationContainer();
                }

                if (!translationContainer) {
                    log(LOG_LEVEL.ERROR, '无法创建或获取翻译容器');
                    return;
                }

                log(LOG_LEVEL.DEBUG, '使用React渲染翻译结果');

                // 确保容器可见
                translationContainer.style.display = 'block';

                try {
                    // 渲染React组件
                    const root = createRoot(translationContainer);
                    root.render(
                        <TranslationItem
                            originalText={originalText}
                            translatedText={translatedText}
                            sourceLang={config.sourceLanguage}
                            targetLang={config.targetLanguage}
                            onSwitch={(swapped) => handleSwitch(swapped, originalText)}
                        />,
                    );
                    log(LOG_LEVEL.INFO, '成功渲染翻译组件');
                } catch (renderError) {
                    log(LOG_LEVEL.ERROR, 'React渲染错误:', renderError);

                    // 降级处理：如果React渲染失败，使用普通DOM API显示翻译结果
                    translationContainer.innerHTML = `
                        <div class="translation-item">
                            <div class="translation-content">
                                <span class="translation-text">${translatedText}</span>
                            </div>
                        </div>
                    `;
                }
            } catch (error) {
                log(LOG_LEVEL.ERROR, '更新翻译容器时出错:', error);
            }
        }

        // 处理语言切换和输入替换
        async function handleSwitch(swapped: boolean, originalText: string) {
            if (swapped) {
                // 更新配置
                const newConfig = {
                    ...config,
                    ...flipLanguages(config.sourceLanguage, config.targetLanguage),
                };

                // 保存新配置
                chrome.storage.sync.set({ translatorConfig: newConfig });

                // 获取当前输入框值的翻译结果
                const translated = await translateText(
                    originalText,
                    config.sourceLanguage,
                    config.targetLanguage,
                );

                // 更新输入框值
                if (searchInput) {
                    searchInput.value = translated;
                }

                // 触发input事件以更新搜索建议
                searchInput?.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // 监听输入变化
        log(LOG_LEVEL.INFO, '为搜索框添加input事件监听器');
        searchInput?.addEventListener('input', (e) => {
            log(LOG_LEVEL.DEBUG, '检测到搜索框输入事件');
            const currentValue = (e.target as HTMLInputElement)?.value.trim() || '';
            log(
                LOG_LEVEL.DEBUG,
                `当前输入值: "${currentValue.slice(0, 20)}${
                    currentValue.length > 20 ? '...' : ''
                }"`,
            );

            // 如果输入为空或与上次相同，不执行翻译
            if (!currentValue || currentValue === lastInputValue) {
                log(LOG_LEVEL.DEBUG, '输入为空或与上次相同，跳过翻译');
                if (!currentValue && translationContainer) {
                    // 移除翻译容器
                    log(LOG_LEVEL.DEBUG, '输入为空，隐藏翻译容器');
                    translationContainer.style.display = 'none';
                }
                return;
            }

            lastInputValue = currentValue;
            log(
                LOG_LEVEL.INFO,
                `准备翻译文本: "${currentValue.slice(0, 20)}${
                    currentValue.length > 20 ? '...' : ''
                }"`,
            );

            // 清除之前的翻译计时器
            if (translationTimeout) {
                log(LOG_LEVEL.DEBUG, '清除之前的翻译计时器');
                clearTimeout(translationTimeout);
            }

            // 设置新的计时器，输入停止后300ms才开始翻译
            log(LOG_LEVEL.DEBUG, '设置新的翻译计时器(300ms延迟)');
            translationTimeout = window.setTimeout(async () => {
                log(LOG_LEVEL.INFO, '输入停止，开始翻译...');
                try {
                    const translated = await translateText(
                        currentValue,
                        config.sourceLanguage,
                        config.targetLanguage,
                    );

                    if (translated) {
                        log(LOG_LEVEL.INFO, '翻译完成，更新UI');
                        updateTranslationContainer(translated, currentValue);
                    } else {
                        log(LOG_LEVEL.WARN, '翻译结果为空');
                    }
                } catch (error) {
                    log(LOG_LEVEL.ERROR, '翻译过程中发生错误:', error);
                }
            }, 300);
        });

        // 处理点击事件 - 当用户点击其他地方时隐藏翻译结果
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            // 如果点击的不是翻译结果或搜索框，则隐藏翻译结果
            if (
                translationContainer &&
                !translationContainer.contains(target) &&
                target !== searchInput &&
                !target.closest('#chrome-search-translator')
            ) {
                translationContainer.style.display = 'none';
            }
        });

        // 监听搜索框聚焦
        searchInput?.addEventListener('focus', () => {
            // 如果有上次的翻译结果且搜索框有值，则显示翻译结果
            if (translationContainer && searchInput?.value.trim()) {
                translationContainer.style.display = 'block';
            }
        });
    } catch (error) {
        log(LOG_LEVEL.ERROR, '设置搜索框监听器时发生错误:', error);
    }
}

// 初始化函数
function initialize() {
    log(LOG_LEVEL.INFO, '开始初始化插件...');
    // 检查是否为Google搜索页面
    const isGoogleSearch =
        document.location.href.includes('google') &&
        (document.location.href.includes('/search') || document.querySelector('input[name="q"]'));

    if (isGoogleSearch) {
        log(LOG_LEVEL.INFO, '检测到Google搜索页面，开始设置翻译功能');
        log(LOG_LEVEL.INFO, '当前页面URL:', document.location.href);

        // 确保在DOM准备好时运行
        if (document.readyState === 'loading') {
            log(LOG_LEVEL.INFO, '页面正在加载，等待DOMContentLoaded事件');
            document.addEventListener('DOMContentLoaded', () => {
                setupSearchBoxListener();
            });
        } else {
            log(LOG_LEVEL.INFO, '页面已加载完成，直接运行搜索监听器');
            // 给页面一点时间完全渲染
            setTimeout(() => {
                setupSearchBoxListener();
            }, 500);
        }

        // 加入MutationObserver监听页面变化
        log(LOG_LEVEL.INFO, '设置MutationObserver监听DOM变化');
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    const searchInput = document.querySelector(
                        'input[name="q"]',
                    ) as HTMLInputElement | null;
                    if (searchInput && !searchInput.dataset.translatorInitialized) {
                        log(LOG_LEVEL.INFO, '检测到新的搜索框元素，重新初始化...');
                        setupSearchBoxListener();
                        break;
                    }
                }
            }
        });

        // 监视整个document的变化
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        } else {
            // 如果还没有body，则等待其创建
            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                });
            });
        }
    } else {
        log(LOG_LEVEL.WARN, '当前页面不是Google搜索页面，脚本不在这个页面运行');
        log(LOG_LEVEL.INFO, '当前页面URL:', document.location.href);
    }
}

// 在页面加载完成后运行初始化函数
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // 如果页面已经加载完成，直接执行初始化
    initialize();
}
