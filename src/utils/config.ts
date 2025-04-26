// 获取用户配置
import { DEFAULT_CONFIG } from '@/utils/log';

export async function getConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['translatorConfig'], (result) => {
            resolve(result.translatorConfig || DEFAULT_CONFIG);
        });
    });
}
