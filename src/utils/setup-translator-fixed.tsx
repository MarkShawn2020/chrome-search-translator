import { createRoot } from 'react-dom/client';

// 主要功能实现
import TranslationItem from '@/contents/google-search/components/TranslationItem';
import type { DEFAULT_CONFIG } from '@/utils/config';
import { getConfig } from '@/utils/config';
import { flipLanguages } from '@/utils/flip-languages';
import logger from '@/utils/log';
import { translateText } from '@/utils/translate-text';

/**
 * 设置翻译器 - 主要功能入口
 * 处理搜索框查找、观察DOM变化和设置翻译功能
 */
export async function setupTranslator() {
    logger.group('翻译器设置');
    logger.debug('获取翻译配置...');
    const config = (await getConfig()) as typeof DEFAULT_CONFIG;

    if (!config.enabled) {
        logger.info('翻译功能已禁用，退出初始化');
        logger.groupEnd();
        return;
    }

    logger.info('翻译功能已启用', {
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
    });

    /**
     * 查找搜索框元素 - 支持多种选择器以适应不同页面结构
     */
    function findSearchInput(): HTMLTextAreaElement | HTMLInputElement | null {
        logger.group('查找搜索输入框');

        // 1. 通过提供的XPath查找
        try {
            logger.debug('尝试使用XPath查找搜索框');
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
            if (element) {
                logger.info('通过XPath找到搜索框', { type: 'textarea', id: element.id });
                logger.groupEnd();
                return element;
            }
            logger.debug('XPath查找无结果');
        } catch (error) {
            logger.warn('XPath查找失败', error);
        }

        // 2. 查找textarea输入框
        logger.debug('尝试使用CSS选择器查找textarea');
        const textarea = document.querySelector('textarea[name="q"]') as HTMLTextAreaElement;
        if (textarea) {
            logger.info('找到textarea搜索框', { id: textarea.id });
            logger.groupEnd();
            return textarea;
        }

        // 3. 查找input输入框
        logger.debug('尝试使用CSS选择器查找input');
        const input = document.querySelector('input[name="q"]') as HTMLInputElement;
        if (input) {
            logger.info('找到input搜索框', { id: input.id, type: input.type });
            logger.groupEnd();
            return input;
        }

        // 4. 通用选择器
        logger.debug('尝试使用通用选择器');
        const anySearchInput = document.querySelector(
            'input[type="text"][name="q"], textarea[name="q"]',
        );

        if (anySearchInput) {
            logger.info('通过通用选择器找到搜索框', {
                tagName: anySearchInput.tagName,
                id: (anySearchInput as HTMLElement).id,
            });
        } else {
            logger.warn('未找到搜索框，翻译功能将无法工作');
        }

        logger.groupEnd();
        return anySearchInput as HTMLTextAreaElement | HTMLInputElement | null;
    }

    /**
     * 为特定搜索框设置翻译功能
     */
    function setupTranslationFor(searchInput: HTMLTextAreaElement | HTMLInputElement) {
        logger.group('设置搜索框翻译功能');
        logger.info('初始化搜索框翻译', {
            type: searchInput.tagName.toLowerCase(),
            id: searchInput.id,
        });

        // 标记已初始化
        searchInput.dataset.translatorInitialized = 'true';

        let lastInputValue = '';
        let translationTimeout: number | undefined;
        let translationContainer: HTMLElement | null = null;

        // 创建翻译结果容器
        function createTranslationContainer() {
            logger.debug('创建翻译结果容器');

            // 检查是否已存在
            const existingContainer = document.querySelector('#chrome-search-translator');
            if (existingContainer) {
                logger.debug('使用已存在的翻译容器');
                return existingContainer;
            }

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
                logger.debug('在建议列表前插入翻译容器');
                suggestionsList.parentNode?.insertBefore(container, suggestionsList);
            } else if (searchForm) {
                // 如果没有建议列表但有表单，附加到表单
                logger.debug('将翻译容器附加到搜索表单');
                searchForm.append(container);
            } else {
                // 最后手段，附加到搜索框旁边
                logger.debug('将翻译容器附加到搜索框旁边');
                const parent = searchInput.parentElement;
                if (parent) {
                    parent.parentElement?.insertBefore(container, parent.nextSibling);
                }
            }

            logger.info('翻译容器创建成功', { id: container.id });
            return container;
        }

        // 更新或创建翻译容器
        function updateTranslationContainer(translatedText: string, originalText: string) {
            logger.debug('更新翻译结果', {
                original: originalText,
                translated: translatedText,
            });

            // 获取或创建容器
            if (!translationContainer) {
                translationContainer = createTranslationContainer();
            }

            if (!translationContainer) {
                logger.warn('无法创建翻译容器，无法显示翻译结果');
                return;
            }

            // 渲染React组件
            logger.debug('渲染翻译组件');
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
                logger.info('处理语言切换', {
                    from: config.sourceLanguage,
                    to: config.targetLanguage,
                    text: originalText,
                });

                // 更新配置
                const newConfig = {
                    ...config,
                    ...flipLanguages(config.sourceLanguage, config.targetLanguage),
                };

                // 保存新配置
                logger.debug('保存新的语言配置', newConfig);
                chrome.storage.sync.set({ translatorConfig: newConfig });

                // 获取当前输入框值的翻译结果
                logger.debug('获取翻译结果以替换搜索框内容');
                const translated = await translateText(
                    originalText,
                    config.sourceLanguage,
                    config.targetLanguage,
                );

                // 更新输入框值
                searchInput.value = translated;
                logger.info('搜索框内容已替换为翻译结果', { translated });

                // 触发input事件以更新搜索建议
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // 监听输入变化
        logger.debug('设置输入监听器');
        searchInput.addEventListener('input', (e) => {
            const currentValue = (e.target as HTMLInputElement | HTMLTextAreaElement).value.trim();

            // 如果输入为空或与上次相同，不执行翻译
            if (!currentValue || currentValue === lastInputValue) {
                if (!currentValue && translationContainer) {
                    logger.debug('输入为空，隐藏翻译容器');
                    translationContainer.style.display = 'none';
                }
                return;
            }

            lastInputValue = currentValue;
            logger.debug('检测到新输入', { text: currentValue });

            // 清除之前的翻译计时器
            if (translationTimeout) {
                clearTimeout(translationTimeout);
            }

            // 设置新的计时器，输入停止后300ms才开始翻译
            logger.debug('设置翻译延迟计时器');
            translationTimeout = window.setTimeout(async () => {
                logger.time('翻译处理');
                const translated = await translateText(
                    currentValue,
                    config.sourceLanguage,
                    config.targetLanguage,
                );

                if (translated) {
                    logger.info('获取到翻译结果', {
                        original: currentValue,
                        translated,
                    });

                    updateTranslationContainer(translated, currentValue);

                    // 显示翻译容器
                    if (translationContainer) {
                        translationContainer.style.display = 'block';
                    }
                } else {
                    logger.warn('翻译失败或结果为空');
                }
                logger.timeEnd('翻译处理');
            }, 300);
        });

        // 处理点击事件 - 当用户点击其他地方时隐藏翻译结果
        logger.debug('设置点击监听器');
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            // 如果点击的不是翻译结果或搜索框，则隐藏翻译结果
            if (
                translationContainer &&
                !translationContainer.contains(target) &&
                target !== searchInput &&
                !target.closest('#chrome-search-translator')
            ) {
                logger.debug('点击了外部区域，隐藏翻译容器');
                translationContainer.style.display = 'none';
            }
        });

        // 监听搜索框聚焦
        logger.debug('设置搜索框聚焦监听器');
        searchInput.addEventListener('focus', () => {
            // 如果有上次的翻译结果且搜索框有值，则显示翻译结果
            if (translationContainer && searchInput.value.trim()) {
                logger.debug('搜索框聚焦，显示翻译容器');
                translationContainer.style.display = 'block';
            }
        });

        // 初始检查当前值
        if (searchInput.value.trim()) {
            logger.debug('搜索框已有初始值，触发翻译');
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        logger.info('搜索框翻译功能设置完成');
        logger.groupEnd();
    }

    /**
     * 创建观察器 - 处理Google动态加载导致的元素变化
     */
    function observeDOMChanges() {
        logger.info('初始化DOM变化观察器');

        // 创建MutationObserver监听动态加载的搜索框
        const observer = new MutationObserver((mutations) => {
            logger.debug('DOM变化检测', { mutationsCount: mutations.length });

            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    const searchInput = findSearchInput();
                    if (searchInput && !searchInput.dataset.translatorInitialized) {
                        logger.info('检测到新的搜索框，应用翻译功能');
                        setupTranslationFor(searchInput);
                        break;
                    }
                }
            }
        });

        // 开始观察整个文档体
        logger.debug('开始观察文档变化');
        observer.observe(document.body, { childList: true, subtree: true });

        // 初次搜索框检查
        logger.info('执行初次搜索框检查');
        const searchInput = findSearchInput();

        if (searchInput) {
            logger.info('找到搜索框，开始设置翻译功能');
            setupTranslationFor(searchInput);
        } else {
            logger.warn('初次检查未找到搜索框，将等待DOM变化');
        }
    }

    // 启动DOM观察
    observeDOMChanges();

    // 完成初始化
    logger.info('翻译器设置完成');
    logger.groupEnd();
}
