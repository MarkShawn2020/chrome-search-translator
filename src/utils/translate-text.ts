// 翻译文本
export async function translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
): Promise<string> {
    try {
        // 使用Google翻译API
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
