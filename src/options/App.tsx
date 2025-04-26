import React, { useEffect, useState } from 'react';

import './App.scss';

// 默认配置
const DEFAULT_CONFIG = {
    enabled: true,
    sourceLanguage: 'zh-CN',
    targetLanguage: 'en',
};

// 语言选项
const LANGUAGE_OPTIONS = [
    { value: 'zh-CN', label: '中文' },
    { value: 'en', label: '英文' },
    { value: 'ja', label: '日语' },
    { value: 'ko', label: '韩语' },
    { value: 'fr', label: '法语' },
    { value: 'de', label: '德语' },
    { value: 'es', label: '西班牙语' },
    { value: 'ru', label: '俄语' },
];

const App: React.FC = () => {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
        type: null,
        message: '',
    });

    // 加载配置
    useEffect(() => {
        chrome.storage.sync.get(['translatorConfig'], (result) => {
            if (result.translatorConfig) {
                console.log('Loaded config:', result.translatorConfig);
                setConfig(result.translatorConfig);
            }
        });
    }, []);

    // 保存配置
    const saveConfig = () => {
        chrome.storage.sync.set({ translatorConfig: config }, () => {
            console.log('Config saved:', config);
            setStatus({
                type: 'success',
                message: '设置已保存',
            });

            // 3秒后清除状态消息
            setTimeout(() => {
                setStatus({ type: null, message: '' });
            }, 3000);
        });
    };

    // 切换启用状态
    const toggleEnabled = () => {
        setConfig((prev) => ({
            ...prev,
            enabled: !prev.enabled,
        }));
    };

    // 切换源语言和目标语言
    const switchLanguages = () => {
        setConfig((prev) => ({
            ...prev,
            sourceLanguage: prev.targetLanguage,
            targetLanguage: prev.sourceLanguage,
        }));
    };

    // 处理语言选择变化
    const handleLanguageChange = (field: 'sourceLanguage' | 'targetLanguage', value: string) => {
        setConfig((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className="app">
            <header className="header">
                <h1 className="title">Google 搜索翻译助手</h1>
                <p className="description">配置搜索翻译助手的设置</p>
            </header>

            <div className="settings-container">
                <div className="settings-card">
                    <div className="settings-section">
                        <h2 className="section-title">基本设置</h2>

                        <div className="setting-item">
                            <div className="setting-label">
                                <label htmlFor="enable-translate">启用翻译功能</label>
                            </div>
                            <div className="setting-control">
                                <div className="toggle-switch">
                                    <input
                                        id="enable-translate"
                                        type="checkbox"
                                        checked={config.enabled}
                                        onChange={toggleEnabled}
                                    />
                                    <span className="toggle-slider" />
                                </div>
                            </div>
                        </div>

                        <div className="setting-item">
                            <div className="setting-label">源语言</div>
                            <div className="setting-control">
                                <select
                                    value={config.sourceLanguage}
                                    onChange={(e) =>
                                        handleLanguageChange('sourceLanguage', e.target.value)
                                    }
                                    className="language-select"
                                >
                                    {LANGUAGE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="setting-item">
                            <div className="setting-label">目标语言</div>
                            <div className="setting-control">
                                <select
                                    value={config.targetLanguage}
                                    onChange={(e) =>
                                        handleLanguageChange('targetLanguage', e.target.value)
                                    }
                                    className="language-select"
                                >
                                    {LANGUAGE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="action-buttons">
                            <button
                                className="switch-button"
                                onClick={switchLanguages}
                                title="交换源语言和目标语言"
                            >
                                切换语言顺序
                            </button>

                            <button className="save-button" onClick={saveConfig}>
                                保存设置
                            </button>
                        </div>

                        {status.type ? <div className={`status-message ${status.type}`}>{status.message}</div> : null}
                    </div>

                    <div className="settings-section">
                        <h2 className="section-title">使用说明</h2>
                        <p className="info-text">
                            启用此功能后，在 Google
                            搜索框中输入文字时，会在下拉候选框顶部显示一条实时翻译结果。
                            点击&quot;切换输入&quot;按钮可以将翻译结果替换到输入框中，并自动翻转源语言和目标语言设置。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
