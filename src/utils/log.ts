/**
 * 专业的日志模块
 * 支持不同级别的日志输出、彩色格式化、分组和可配置性
 */

// 应用名称，用于日志前缀
const APP_NAME = 'SearchTranslator';

// 日志级别定义
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4, // 完全关闭日志
}

// 日志配置接口
interface LoggerConfig {
    level: LogLevel; // 当前日志级别
    enabled: boolean; // 是否启用日志
    showTimestamp: boolean; // 是否显示时间戳
    showLogLevel: boolean; // 是否显示日志级别
    groupEnabled: boolean; // 是否启用分组
}

// 默认配置
const DEFAULT_CONFIG: LoggerConfig = {
    level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
    enabled: true,
    showTimestamp: true,
    showLogLevel: true,
    groupEnabled: true,
};

// 样式定义
const STYLES = {
    reset: 'color: inherit',
    debug: 'color: #6495ED', // 蓝色
    info: 'color: #008000', // 绿色
    warn: 'color: #FFA500', // 橙色
    error: 'color: #FF0000', // 红色
    prefix: 'color: #8A2BE2; font-weight: bold', // 紫色加粗
    timestamp: 'color: #AAAAAA', // 灰色
};

/**
 * Logger类 - 提供分级日志功能
 */
class Logger {
    private config: LoggerConfig;
    private groupDepth = 0;

    constructor(config?: Partial<LoggerConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 更新日志配置
     */
    public configure(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * 设置日志级别
     */
    public setLevel(level: LogLevel): void {
        this.config.level = level;
    }

    /**
     * 启用或禁用日志
     */
    public setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
    }

    /**
     * 格式化日志前缀
     */
    private formatPrefix(level: string): string[] {
        const parts: string[] = [];
        const texts: string[] = [];

        // 添加应用名称前缀
        parts.push(`%c[${APP_NAME}]`);
        texts.push(STYLES.prefix);

        // 添加时间戳
        if (this.config.showTimestamp) {
            const now = new Date();
            const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
            parts.push(`%c[${timestamp}]`);
            texts.push(STYLES.timestamp);
        }

        // 添加日志级别
        if (this.config.showLogLevel) {
            parts.push(`%c[${level.toUpperCase()}]`);
            texts.push(STYLES[level as keyof typeof STYLES] || STYLES.reset);
        }

        // 添加主内容样式占位符
        parts.push('%c');
        texts.push(STYLES[level as keyof typeof STYLES] || STYLES.reset);

        return [...parts, ...texts];
    }

    /**
     * 通用日志方法
     */
    private log(level: LogLevel, type: string, ...args: unknown[]): void {
        if (!this.config.enabled || level < this.config.level) {
            return;
        }

        const prefixParts = this.formatPrefix(type);
        const prefix = prefixParts.slice(0, prefixParts.length / 2).join(' ');
        const styles = prefixParts.slice(prefixParts.length / 2);

        // 根据不同类型使用不同的console方法
        let method: (...args: any[]) => void;

        switch (type) {
            case 'error':
                method = console.error;
                break;
            case 'warn':
                method = console.warn;
                break;
            case 'info':
                method = console.info;
                break;
            case 'debug':
            default:
                method = console.log;
        }

        // 添加缩进
        const indent = this.config.groupEnabled ? '  '.repeat(this.groupDepth) : '';
        method(prefix + indent, ...styles, ...args);
    }

    /**
     * Debug级别日志
     */
    public debug(...args: unknown[]): void {
        this.log(LogLevel.DEBUG, 'debug', ...args);
    }

    /**
     * Info级别日志
     */
    public info(...args: unknown[]): void {
        this.log(LogLevel.INFO, 'info', ...args);
    }

    /**
     * Warn级别日志
     */
    public warn(...args: unknown[]): void {
        this.log(LogLevel.WARN, 'warn', ...args);
    }

    /**
     * Error级别日志
     */
    public error(...args: unknown[]): void {
        this.log(LogLevel.ERROR, 'error', ...args);
    }

    /**
     * 开始分组
     */
    public group(label?: string): void {
        if (!this.config.enabled || !this.config.groupEnabled) {
            return;
        }

        if (label) {
            const prefixParts = this.formatPrefix('info');
            const prefix = prefixParts.slice(0, prefixParts.length / 2).join(' ');
            const styles = prefixParts.slice(prefixParts.length / 2);

            const indent = '  '.repeat(this.groupDepth);
            console.group(prefix + indent, ...styles, label);
        } else {
            console.group();
        }

        this.groupDepth++;
    }

    /**
     * 结束分组
     */
    public groupEnd(): void {
        if (!this.config.enabled || !this.config.groupEnabled || this.groupDepth === 0) {
            return;
        }

        console.groupEnd();
        this.groupDepth--;
    }

    /**
     * 计时开始
     */
    public time(label: string): void {
        if (!this.config.enabled) return;
        console.time(label);
    }

    /**
     * 计时结束并显示
     */
    public timeEnd(label: string): void {
        if (!this.config.enabled) return;
        console.timeEnd(label);
    }

    /**
     * 记录功能执行过程日志
     * @param feature 功能名称
     * @param action 动作描述
     * @param data 相关数据
     */
    public logFeature(feature: string, action: string, data?: unknown): void {
        this.info(`${feature} > ${action}`, data);
    }
}

// 导出单例
const logger = new Logger();
export default logger;
