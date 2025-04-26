import { createRoot } from 'react-dom/client';

import TranslationItem from './components/TranslationItem';

import './style.scss';

// 默认配置
const DEFAULT_CONFIG = {
    enabled: true,
    sourceLanguage: 'zh-CN',
    targetLanguage: 'en',
};

// 获取用户配置
async function getConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['translatorConfig'], (result) => {
            resolve(result.translatorConfig || DEFAULT_CONFIG);
        });
    });
}

// 翻译文本
async function translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
): Promise<string> {
    try {
        // 使用Google翻译API
        // 这里使用的是免费的API，实际应用中可能需要使用更可靠的付费API
        const response = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
                text,
            )}`,
        );
        const data = await response.json();

        // 提取翻译后的文本
        if (data && data[0] && data[0][0]) {
            return data[0][0][0];
        }
        return '';
    } catch (error) {
        console.error('Translation error:', error);
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
    const config = (await getConfig()) as typeof DEFAULT_CONFIG;

    if (!config.enabled) return;

    // 查找搜索框
    const searchInput = document.querySelector('input[name="q"]') as HTMLInputElement;
    if (!searchInput) return;

    // 监听输入事件
    let lastInputValue = '';
    let translationTimeout: number | undefined;
    let translationContainer: HTMLElement | null = null;

    // 创建翻译结果容器
    function createTranslationContainer() {
        const searchForm = searchInput.closest('form');
        if (!searchForm) return null;

        // 检查是否已存在
        const existingContainer = document.querySelector('#chrome-search-translator');
        if (existingContainer) return existingContainer;

        // 创建新容器
        const container = document.createElement('div');
        container.id = 'chrome-search-translator';
        container.className = 'chrome-search-translator-container';

        // 查找插入位置 - 在搜索建议列表之前
        const suggestionsList = document.querySelector('ul[role="listbox"]');
        if (suggestionsList) {
            suggestionsList.parentNode?.insertBefore(container, suggestionsList);
        } else {
            // 如果找不到建议列表，则附加到表单
            searchForm.append(container);
        }

        return container;
    }

    // 更新或创建翻译容器
    function updateTranslationContainer(translatedText: string, originalText: string) {
        // 获取或创建容器
        if (!translationContainer) {
            translationContainer = createTranslationContainer();
        }

        if (!translationContainer) return;

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
            searchInput.value = translated;

            // 触发input事件以更新搜索建议
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // 监听输入变化
    searchInput.addEventListener('input', (e) => {
        const currentValue = (e.target as HTMLInputElement).value.trim();

        // 如果输入为空或与上次相同，不执行翻译
        if (!currentValue || currentValue === lastInputValue) {
            if (!currentValue && // 移除翻译容器
                translationContainer) {
                    translationContainer.style.display = 'none';
                }
            return;
        }

        lastInputValue = currentValue;

        // 清除之前的翻译计时器
        if (translationTimeout) {
            clearTimeout(translationTimeout);
        }

        // 设置新的计时器，输入停止后300ms才开始翻译
        translationTimeout = window.setTimeout(async () => {
            const translated = await translateText(
                currentValue,
                config.sourceLanguage,
                config.targetLanguage,
            );

            if (translated) {
                updateTranslationContainer(translated, currentValue);

                // 显示翻译容器
                if (translationContainer) {
                    translationContainer.style.display = 'block';
                }
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
    searchInput.addEventListener('focus', () => {
        // 如果有上次的翻译结果且搜索框有值，则显示翻译结果
        if (translationContainer && searchInput.value.trim()) {
            translationContainer.style.display = 'block';
        }
    });
}

// 初始化
function init() {
    // 确保DOM已完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupSearchBoxListener);
    } else {
        setupSearchBoxListener();
    }
}

init();
