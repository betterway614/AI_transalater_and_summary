# VoiceBridge · 语桥

基于 Electron + React 构建的 AI 同声传译桌面应用，支持从视频 URL、系统音频或麦克风捕获语音，实时生成双语字幕并提供 AI 摘要。

## 功能特性

- **多种音频输入模式**
  - URL 模式：输入视频链接（YouTube、B站等），通过 yt-dlp 提取音频并翻译
  - 系统音频模式：实时捕获系统音频输出进行同声传译
  - 麦克风模式：通过麦克风采集语音进行实时翻译

- **实时双语字幕**：原文 + 译文双行显示，支持自定义字体、颜色、背景透明度

- **AI 摘要**：自动对翻译内容生成摘要总结

- **会话管理**：历史记录查看与导出（Markdown 格式）

- **高度可定制**
  - AI 引擎配置（OpenAI Whisper 语音识别 + DeepSeek 翻译）
  - 字幕样式（字号、配色、背景、最大行数）
  - 音频设置（输入设备、VAD 灵敏度、采样率）
  - 主题切换（深色 / 浅色 / 跟随系统）

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 33 + electron-vite |
| 前端 | React 18 + TypeScript |
| UI 组件 | MUI 6 (Material Design) |
| 样式 | Tailwind CSS 3 + Emotion |
| 状态管理 | Zustand |
| 路由 | React Router 6 |
| 语音识别 | OpenAI Whisper API |
| 翻译引擎 | DeepSeek API |
| 音频提取 | yt-dlp |
| 构建 | Vite 5 + electron-builder |
| 测试 | Vitest + Testing Library |

## 项目结构

```
├── src/
│   ├── main/                  # Electron 主进程
│   │   ├── index.ts           # 应用入口、窗口管理 IPC
│   │   ├── window.ts          # BrowserWindow 创建与配置
│   │   ├── ipc/               # IPC 处理器
│   │   │   ├── audio.ipc.ts   # 系统音频相关 IPC
│   │   │   └── ytdlp.ipc.ts   # yt-dlp 音频提取 IPC
│   │   └── services/          # 主进程服务
│   │       ├── system-audio.service.ts
│   │       └── ytdlp.service.ts
│   ├── preload/               # 预加载脚本（安全桥接）
│   ├── renderer/              # React 渲染进程
│   │   └── src/
│   │       ├── components/    # UI 组件
│   │       │   ├── Common/        # 通用组件（控制栏、状态标签）
│   │       │   ├── DeviceSelector/# 音频设备选择器
│   │       │   ├── Layout/        # 布局（侧边栏、标题栏）
│   │       │   ├── ModeSelector/  # 输入模式切换
│   │       │   ├── Subtitle/      # 字幕面板
│   │       │   ├── Summary/       # AI 摘要面板
│   │       │   └── URLInput/      # URL 输入面板
│   │       ├── pages/         # 页面（首页、历史、设置）
│   │       └── store/         # Zustand 状态管理
│   └── shared/                # 主进程与渲染进程共享代码
│       ├── types.ts           # TypeScript 类型定义
│       ├── constants.ts       # 常量
│       └── ipc-channels.ts    # IPC 通道名称
├── docs/                      # 项目文档（PRD、架构设计）
├── resources/                 # 应用资源（图标等）
├── electron.vite.config.ts    # electron-vite 构建配置
├── tailwind.config.js         # Tailwind CSS 配置
└── tsconfig*.json             # TypeScript 配置
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9
- Python >= 3.8（yt-dlp 音频提取依赖）
- 各平台 C++ 构建工具（编译 Electron 原生模块所需）

### Electron 环境安装

#### 1. 安装 Node.js

前往 [Node.js 官网](https://nodejs.org/) 下载 **LTS 版本**（>= 18），安装时勾选"Add to PATH"。

安装完成后验证：

```bash
node -v    # 应输出 v18.x.x 或更高
npm -v     # 应输出 9.x.x 或更高
```

> 推荐使用 [nvm](https://github.com/nvm-sh/nvm)（macOS/Linux）或 [nvm-windows](https://github.com/coreybutler/nvm-windows) 管理多版本 Node.js：
>
> ```bash
> nvm install 18
> nvm use 18
> ```

#### 2. 安装平台构建工具

Electron 的部分原生依赖（如 `electron-rebuild`）需要 C++ 编译环境：

**Windows**

```bash
npm install -g windows-build-tools
```

或手动安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，勾选"Desktop development with C++"工作负载。

**macOS**

```bash
xcode-select --install
```

**Linux (Ubuntu/Debian)**

```bash
sudo apt-get install -y build-essential libx11-dev libxkbfile-dev libsecret-1-dev
```

#### 3. 安装 Python（yt-dlp 依赖）

本项目使用 yt-dlp 提取视频音频，需要 Python 环境：

- **Windows**：前往 [Python 官网](https://www.python.org/downloads/) 下载安装，安装时勾选"Add Python to PATH"
- **macOS**：`brew install python3`
- **Linux**：`sudo apt-get install python3`

验证安装：

```bash
python3 --version   # 应输出 Python 3.8+
```

#### 4. 安装 yt-dlp

```bash
# 通过 pip 安装
pip install yt-dlp

# 或通过包管理器
# macOS
brew install yt-dlp
# Windows (scoop)
scoop install yt-dlp
# Linux
sudo apt-get install yt-dlp
```

验证安装：

```bash
yt-dlp --version
```

#### 5. 安装项目依赖并启动

完成以上环境准备后，回到项目目录：

```bash
# 克隆项目
git clone <仓库地址>
cd AI_transalater_and_summary

# 安装所有依赖（含 Electron）
npm install

# 启动开发模式
npm run dev
```

首次运行 `npm install` 时会自动下载 Electron 二进制文件（约 80MB），请确保网络通畅。如遇下载缓慢，可设置镜像源：

```bash
# 使用淘宝镜像
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建打包

```bash
npm run build
```

### 类型检查

```bash
npm run typecheck
```

### 运行测试

```bash
npm run test
```

## 配置说明

应用启动后进入 **设置页面**，需配置以下 API 密钥：

| 服务 | 用途 | 默认模型 |
|------|------|----------|
| OpenAI Whisper | 语音转文字 | `whisper-1` |
| DeepSeek | 文本翻译 + 摘要 | `deepseek-chat` |

## 许可证

MIT
