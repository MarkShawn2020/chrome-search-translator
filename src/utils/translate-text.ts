import logger from './log';

// 简单的翻译缓存以减少API调用
const translationCache: Record<string, string> = {};

// 基本翻译函数
export async function translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
): Promise<string> {
    if (!text) return '';

    // 创建缓存键
    const cacheKey = `${text}|${sourceLang}|${targetLang}`;

    // 检查缓存
    if (translationCache[cacheKey]) {
        logger.debug('使用缓存的翻译结果', { text, from: sourceLang, to: targetLang });
        return translationCache[cacheKey];
    }

    try {
        logger.debug('请求翻译API', { text, from: sourceLang, to: targetLang });

        // 使用Google翻译API
        const response = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
                text,
            )}`,
            {
                // 添加超时设置
                signal: AbortSignal.timeout(5000),
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            },
        );

        if (!response.ok) {
            throw new Error(`API返回错误: ${response.status}`);
        }

        const data = await response.json();

        // 提取翻译后的文本
        if (data && data[0] && data[0][0]) {
            const result = data[0][0][0];
            // 存入缓存
            translationCache[cacheKey] = result;
            return result;
        }

        // 如果结构不符合预期
        logger.warn('翻译API返回的数据结构异常', { data });
        return text; // 返回原文本而非空字符串
    } catch (error) {
        logger.error('翻译出错', { error, text, from: sourceLang, to: targetLang });

        // 在翻译失败时返回原文而非空字符串
        // 这确保了即使API失败，UI也不会显示空白
        return text;
    }
}

// 简单的语言检测函数，作为备选方案
export function detectLanguage(text: string): 'zh-CN' | 'en' {
    // 简单检测：如果包含中文字符，则认为是中文
    const hasChineseChar = /[\u4E00-\u9FA5]/.test(text);
    return hasChineseChar ? 'zh-CN' : 'en';
}
