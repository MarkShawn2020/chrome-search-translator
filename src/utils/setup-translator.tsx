import { createRoot } from 'react-dom/client';

// 主要功能实现
import TranslationItem from '@/contents/google-search/components/TranslationItem';
import type { DEFAULT_CONFIG } from '@/utils/config';
import { getConfig } from '@/utils/config';
import { flipLanguages } from '@/utils/flip-languages';
import logger from '@/utils/log';
import { translateText } from '@/utils/translate-text';

export async function setupTranslator() {
    logger.group('翻译器设置');
    logger.debug('获取翻译配置...');
    let config = (await getConfig()) as typeof DEFAULT_CONFIG;

    if (!config.enabled) {
        logger.info('翻译功能已禁用，退出初始化');
        logger.groupEnd();
        return;
    }

    logger.info('翻译功能已启用', {
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
    });

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
        let root: ReturnType<typeof createRoot> | null = null;

        // 创建翻译结果容器
        function createTranslationContainer(): HTMLElement {
            // 检查是否已存在
            const existingContainer = document.querySelector('#chrome-search-translator');
            if (existingContainer) return existingContainer as HTMLElement;

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
            if (!root) {
                // 只在第一次创建React根
                logger.debug('创建React根组件');
                root = createRoot(translationContainer);
            }

            // 重复使用现有的根进行更新
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
                logger.group('切换输入功能');
                logger.info('用户点击切换按钮', { originalText });

                // 阻止任何正在进行的表单提交
                const form = searchInput.closest('form');
                if (form) {
                    const originalSubmit = form.onsubmit;
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    });

                    setTimeout(() => {
                        // 在处理完成后恢复原始的提交处理程序
                        if (!originalSubmit) return;
                        form.addEventListener('submit', originalSubmit);
                    }, 200);
                }

                try {
                    // 获取当前输入框值的翻译结果
                    logger.debug('开始翻译原文本', { text: originalText });
                    const translated = await translateText(
                        originalText,
                        config.sourceLanguage,
                        config.targetLanguage,
                    );

                    logger.info('翻译完成', {
                        originalText,
                        translatedText: translated,
                        success: translated !== originalText,
                    });

                    // 更新配置 - 翻转源语言和目标语言
                    const newConfig = {
                        ...config,
                        ...flipLanguages(config.sourceLanguage, config.targetLanguage),
                    };

                    // 保存新配置
                    logger.debug('保存新的语言配置', {
                        from: newConfig.sourceLanguage,
                        to: newConfig.targetLanguage,
                    });
                    chrome.storage.sync.set({ translatorConfig: newConfig });

                    config = newConfig;

                    // 使用更可靠的方法更新输入框值
                    if (
                        searchInput.tagName.toLowerCase() === 'textarea' ||
                        searchInput.tagName.toLowerCase() === 'input'
                    ) {
                        // 1. 模拟获取焦点
                        searchInput.focus();

                        // 2. 清空当前值并设置新值
                        searchInput.value = translated;

                        // 3. 触发多种事件确保Google搜索能识别变化
                        const events = ['input', 'change', 'keyup', 'keydown', 'keypress'];

                        // 使用更精确的事件触发方式，但阻止事件冒泡以避免触发搜索
                        events.forEach((eventType) => {
                            const event = new Event(eventType, {
                                bubbles: false,
                                cancelable: true,
                            });
                            searchInput.dispatchEvent(event);
                        });

                        // 4. 额外处理：如果是textarea，尝试触发一个合成事件
                        if (searchInput.tagName.toLowerCase() === 'textarea') {
                            const textEvent = new InputEvent('input', {
                                bubbles: false, // 设置为false以避免事件冒泡触发导航
                                cancelable: true,
                                inputType: 'insertText',
                                data: translated,
                            });
                            searchInput.dispatchEvent(textEvent);
                        }

                        // 5. 如果上面方法都不生效，尝试使用剪贴板API
                        setTimeout(async () => {
                            if (searchInput.value !== translated) {
                                logger.debug('常规方法未能更新输入框，尝试剪贴板方法');
                                try {
                                    await navigator.clipboard.writeText(translated);
                                    document.execCommand('paste');
                                } catch (clipboardError) {
                                    logger.error('剪贴板操作失败', { clipboardError });
                                }
                            }
                        }, 50);
                    }

                    logger.info('输入框内容已更新', { newValue: searchInput.value });
                } catch (error) {
                    logger.error('切换输入时发生错误', { error });
                } finally {
                    logger.groupEnd();
                }
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
