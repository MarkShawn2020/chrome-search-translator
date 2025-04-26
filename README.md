# Google Search Translator (搜索翻译助手)

> 一个实用的 Chrome 扩展，可实时翻译 Google 搜索内容，支持多语言互译和快速替换输入。

基于 React & TypeScript & Webpack 构建

## 项目介绍

这是一个 Chrome 扩展插件，可以在 Google 搜索时自动提供输入内容的翻译结果。当您在搜索框中输入内容时，会在搜索建议的下拉框顶部显示翻译后的内容，并提供快速替换功能，让您可以一键切换搜索语言。

## :sparkles: 功能特性

- :globe_with_meridians: **实时翻译**：在 Google 搜索框输入时，实时翻译您的搜索内容
- :arrows_counterclockwise: **语言切换**：支持中、英、日、韩等多种语言之间的互译
- :zap: **快速替换**：一键将翻译结果替换到搜索框，无需手动复制粘贴
- :gear: **灵活配置**：可自定义源语言和目标语言，满足不同用户的需求
- :art: **美观界面**：精心设计的 UI，适配 Google 搜索的明暗两种主题
- :shield: **性能优化**：采用防抖处理，减少 API 请求次数，提升响应速度

## :arrow_down: 安装方法

### 方法一：从 Chrome 商店安装

1. 访问[Chrome 网上应用店](https://chrome.google.com/webstore/detail/...)
2. 点击"添加至 Chrome"按钮

### 方法二：开发者模式安装

1. 下载此仓库并解压
2. 运行 `pnpm install` 安装依赖
3. 运行 `pnpm build` 构建扩展
4. 打开 Chrome，访问 `chrome://extensions/`
5. 开启右上角的"开发者模式"
6. 点击"加载已解压的扩展程序"按钮
7. 选择项目目录下的 `extension` 文件夹

## :rocket: 使用方法

1. 安装扩展后，访问 Google 搜索页面
2. 在搜索框中输入内容（默认识别为中文）
3. 下拉框第一行将显示翻译后的内容（默认翻译为英文）
4. 点击「切换输入」按钮可将翻译结果替换到搜索框中

## :wrench: 自定义设置

1. 点击 Chrome 工具栏上的扩展图标
2. 选择「选项」打开设置页面
3. 可以设置以下选项：
   - 启用/禁用翻译功能
   - 设置源语言和目标语言
   - 切换语言顺序

## :package: 开发相关

### 项目结构

- `src/contents/google-search/index.tsx`: 核心内容脚本，处理翻译逻辑
- `src/contents/google-search/components/TranslationItem.tsx`: 翻译结果 UI 组件
- `src/options/App.tsx`: 选项页面逻辑和界面

### 开发环境

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm start

# 构建生产版本
pnpm build
```

## :handshake: 贡献

欢迎提交 Issue 和 Pull Request，一起完善这个项目。

## :page_facing_up: 许可证

MIT License
