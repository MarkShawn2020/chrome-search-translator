// 获取用户配置

// 默认配置
export const DEFAULT_CONFIG = {
    enabled: true,
    sourceLanguage: 'zh-CN',
    targetLanguage: 'en',
};

export async function getConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['translatorConfig'], (result) => {
            resolve(result.translatorConfig || DEFAULT_CONFIG);
        });
    });
}
