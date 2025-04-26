import React from 'react';

interface TranslationItemProps {
    originalText: string; // 保留原始文本为必选参数，但在实现中可能暂不使用
    translatedText: string;
    sourceLang: string;
    targetLang: string;
    onSwitch: (swapped: boolean) => void;
}

// 获取语言显示名称 - 移到组件外部解决ESLint错误
const getLanguageDisplayName = (code: string): string => {
    const languageMap: Record<string, string> = {
        'zh-CN': '中文',
        'en': '英文',
        'ja': '日语',
        'ko': '韩语',
        'fr': '法语',
        'de': '德语',
        'es': '西班牙语',
        'ru': '俄语',
    };

    return languageMap[code] || code;
};

const TranslationItem: React.FC<TranslationItemProps> = (props) => {
    const {
        // 由于暂时不需要使用originalText，我们不从props中解构它
        translatedText,
        sourceLang,
        targetLang,
        onSwitch,
    } = props;
    const handleClick = (e: React.MouseEvent) => {
        // 阻止事件冒泡和默认行为，防止触发Google搜索的页面跳转
        e.preventDefault();
        e.stopPropagation();

        // 调用切换回调
        onSwitch(true);
    };

    return (
        <div className="translation-item">
            <div className="translation-content">
                <span className="translation-text">{translatedText}</span>
                <span className="translation-lang">
                    {getLanguageDisplayName(sourceLang)} → {getLanguageDisplayName(targetLang)}
                </span>
            </div>
            <button
                className="translation-switch-btn"
                onClick={handleClick}
                onMouseDown={(e) => e.preventDefault()} // 防止鼠标按下事件引起的失焦和导航
                title="点击替换搜索框输入"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M11 5h10M11 9h7M11 13h4M3 17l4 4 4-4M7 21V7" />
                </svg>
                <span>切换输入</span>
            </button>
        </div>
    );
};

export default TranslationItem;
