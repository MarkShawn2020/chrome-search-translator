import { createRoot } from 'react-dom/client';

// 主要功能实现
import TranslationItem from '@/contents/google-search/components/TranslationItem';
import type { DEFAULT_CONFIG } from '@/utils/config';
import { getConfig } from '@/utils/config';
import { flipLanguages } from '@/utils/flip-languages';
import { translateText } from '@/utils/translate-text';

export async function setupTranslator() {
    const config = (await getConfig()) as typeof DEFAULT_CONFIG;
    if (!config.enabled) return;

    // 查找搜索框元素 - 支持多种选择器以适应不同页面结构
    function findSearchInput(): HTMLTextAreaElement | HTMLInputElement | null {
        // 1. 通过提供的XPath查找
        try {
            const xpath =
                '/html/body/div[2]/div[2]/form/div[1]/div[1]/div[2]/div[1]/div[2]/textarea';
            const result = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null,
            );
            const element = result.singleNodeValue as HTMLTextAreaElement;
            if (element) return element;
        } catch {
            console.log('XPath search failed, trying other methods');
        }

        // 2. 查找textarea输入框
        const textarea = document.querySelector('textarea[name="q"]') as HTMLTextAreaElement;
        if (textarea) return textarea;

        // 3. 查找input输入框
        const input = document.querySelector('input[name="q"]') as HTMLInputElement;
        if (input) return input;

        // 4. 通用选择器
        const anySearchInput = document.querySelector(
            'input[type="text"][name="q"], textarea[name="q"]',
        );
        return anySearchInput as HTMLTextAreaElement | HTMLInputElement | null;
    }

    // 创建观察器 - 处理Google动态加载导致的元素变化
    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    const searchInput = findSearchInput();
                    if (searchInput && !searchInput.dataset.translatorInitialized) {
                        setupTranslationFor(searchInput);
                        break;
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // 初次检查
        const searchInput = findSearchInput();
        if (searchInput) {
            setupTranslationFor(searchInput);
        }
    }

    // 为特定搜索框设置翻译功能
    function setupTranslationFor(searchInput: HTMLTextAreaElement | HTMLInputElement) {
        // 标记已初始化
        searchInput.dataset.translatorInitialized = 'true';

        let lastInputValue = '';
        let translationTimeout: number | undefined;
        let translationContainer: HTMLElement | null = null;

        // 创建翻译结果容器
        function createTranslationContainer() {
            // 检查是否已存在
            const existingContainer = document.querySelector('#chrome-search-translator');
            if (existingContainer) return existingContainer;

            // 创建新容器
            const container = document.createElement('div');
            container.id = 'chrome-search-translator';
            container.className = 'chrome-search-translator-container';

            // 查找表单和建议列表
            const searchForm = searchInput.closest('form');
            const suggestionsList = document.querySelector('ul[role="listbox"]');

            // 根据页面结构插入容器
            if (suggestionsList) {
                // 如果有建议列表，插入在前面
                suggestionsList.parentNode?.insertBefore(container, suggestionsList);
            } else if (searchForm) {
                // 如果没有建议列表但有表单，附加到表单
                searchForm.append(container);
            } else {
                // 最后手段，附加到搜索框旁边
                const parent = searchInput.parentElement;
                if (parent) {
                    parent.parentElement?.insertBefore(container, parent.nextSibling);
                }
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
            const currentValue = (e.target as HTMLInputElement | HTMLTextAreaElement).value.trim();

            // 如果输入为空或与上次相同，不执行翻译
            if (!currentValue || currentValue === lastInputValue) {
                if (
                    !currentValue && // 移除翻译容器
                    translationContainer
                ) {
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

        // 初始检查当前值
        if (searchInput.value.trim()) {
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // 启动观察器
    setupObserver();
}
