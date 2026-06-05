# AI 同声传译桌面助手 — Phase 1 & 2 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 Electron + React + TypeScript 桌面应用脚手架，完成核心 UI 框架，实现可运行的界面原型。

**Architecture:** 基于 electron-vite 构建，主进程负责系统级操作（yt-dlp、系统音频、文件导出），渲染进程为 React SPA 负责 UI 和 AI API 调用，通过 IPC 桥通信。状态管理使用 Zustand，UI 使用 MUI + Tailwind CSS。

**Tech Stack:** Electron 33+, React 18, TypeScript 5, Vite 5, electron-vite 2, MUI 6, Tailwind CSS 3, Zustand 4

**参考文档:**
- PRD: `docs/prd-ai-interpreter.md`
- 架构: `docs/architecture-ai-interpreter.md`

---

## 文件结构总览

```
ai-interpreter-desktop/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── .eslintrc.cjs
│
├── src/
│   ├── main/
│   │   ├── index.ts                    # 主进程入口
│   │   ├── window.ts                   # 窗口管理
│   │   └── preload/
│   │       ├── index.ts                # preload 入口
│   │       └── index.d.ts             # 类型声明
│   │
│   ├── renderer/
│   │   ├── index.html                  # HTML 入口
│   │   ├── src/
│   │   │   ├── main.tsx               # React 入口
│   │   │   ├── App.tsx                # 根组件
│   │   │   ├── assets/
│   │   │   │   └── styles/
│   │   │   │       └── global.css     # Tailwind 全局样式
│   │   │   ├── components/
│   │   │   │   ├── Layout/
│   │   │   │   │   ├── AppLayout.tsx
│   │   │   │   │   ├── TitleBar.tsx
│   │   │   │   │   └── Sidebar.tsx
│   │   │   │   ├── Subtitle/
│   │   │   │   │   ├── SubtitlePanel.tsx
│   │   │   │   │   └── SubtitleLine.tsx
│   │   │   │   ├── ModeSelector/
│   │   │   │   │   └── ModeTabs.tsx
│   │   │   │   ├── URLInput/
│   │   │   │   │   └── URLInputPanel.tsx
│   │   │   │   ├── DeviceSelector/
│   │   │   │   │   └── DeviceSelector.tsx
│   │   │   │   ├── Summary/
│   │   │   │   │   └── SummaryPanel.tsx
│   │   │   │   └── Common/
│   │   │   │       ├── StatusBadge.tsx
│   │   │   │       └── ControlBar.tsx
│   │   │   ├── pages/
│   │   │   │   ├── HomePage.tsx
│   │   │   │   ├── HistoryPage.tsx
│   │   │   │   └── SettingsPage.tsx
│   │   │   ├── store/
│   │   │   │   ├── appStore.ts
│   │   │   │   ├── subtitleStore.ts
│   │   │   │   └── settingsStore.ts
│   │   │   └── types/
│   │   │       ├── audio.ts
│   │   │       ├── subtitle.ts
│   │   │       └── ipc.ts
│   │   └── electron-env.d.ts
│   │
│   └── shared/
│       ├── types.ts                    # 共享类型定义
│       ├── constants.ts                # 共享常量
│       └── ipc-channels.ts            # IPC 通道名枚举
│
├── resources/
│   └── icon.png
│
└── tests/
    └── renderer/
        └── components/
            └── SubtitleLine.test.tsx
```

---

## Phase 1: 项目脚手架

### Task 1: 初始化 Electron + Vite + React + TS 项目

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `.gitignore`
- Create: `.eslintrc.cjs`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "ai-interpreter-desktop",
  "version": "0.1.0",
  "description": "AI 同声传译桌面助手",
  "main": "./out/main/index.js",
  "author": "AI Interpreter Team",
  "license": "MIT",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "start": "electron-vite preview",
    "typecheck:node": "tsc --noEmit -p tsconfig.node.json",
    "typecheck:web": "tsc --noEmit -p tsconfig.web.json",
    "typecheck": "npm run typecheck:node && npm run typecheck:web",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "@emotion/react": "^11.13.0",
    "@emotion/styled": "^11.13.0",
    "@mui/icons-material": "^6.4.0",
    "@mui/material": "^6.4.0",
    "electron-store": "^8.2.0",
    "electron-log": "^5.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "electron": "^33.2.0",
    "electron-builder": "^25.1.0",
    "electron-vite": "^2.3.0",
    "eslint": "^8.57.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: 创建 electron.vite.config.ts**

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()],
    css: {
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer')
        ]
      }
    }
  }
})
```

- [ ] **Step 3: 创建 tsconfig.json（根配置）**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

- [ ] **Step 4: 创建 tsconfig.node.json（主进程 + preload）**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "lib": ["ESNext"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "outDir": "./out",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": [
    "src/main/**/*",
    "src/preload/**/*",
    "src/shared/**/*",
    "electron.vite.config.ts"
  ]
}
```

- [ ] **Step 5: 创建 tsconfig.web.json（渲染进程）**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "outDir": "./out",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/renderer/src/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": [
    "src/renderer/**/*",
    "src/shared/**/*"
  ]
}
```

- [ ] **Step 6: 创建 .gitignore**

```
node_modules/
out/
dist/
.DS_Store
*.log
.env
.env.local
```

- [ ] **Step 7: 安装依赖并验证**

Run:
```bash
cd e:/githubproject/AI_transalater_and_summary
npm install
```
Expected: 安装成功，无报错

- [ ] **Step 8: Commit**

```bash
git add package.json electron.vite.config.ts tsconfig.json tsconfig.node.json tsconfig.web.json .gitignore .eslintrc.cjs package-lock.json
git commit -m "feat: initialize Electron + Vite + React + TS project scaffolding"
```

---

### Task 2: 配置 Tailwind CSS + PostCSS

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/renderer/src/assets/styles/global.css`

- [ ] **Step 1: 创建 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3',
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,  // 避免与 MUI 样式冲突
  },
}
```

- [ ] **Step 2: 创建 postcss.config.js**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: 创建 global.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.5);
}

/* 禁用文本选择（标题栏区域） */
.no-drag {
  -webkit-app-region: no-drag;
}

.drag {
  -webkit-app-region: drag;
}
```

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js postcss.config.js src/renderer/src/assets/styles/global.css
git commit -m "feat: configure Tailwind CSS and global styles"
```

---

### Task 3: 定义共享类型和 IPC 通道

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/ipc-channels.ts`
- Create: `src/shared/constants.ts`

- [ ] **Step 1: 创建 src/shared/types.ts**

```typescript
// ===== 音频输入模式 =====
export type InputMode = 'url' | 'system-audio' | 'microphone';

// ===== 应用状态 =====
export type AppStatus = 'idle' | 'connecting' | 'listening' | 'translating' | 'error';

// ===== 字幕条目 =====
export interface SubtitleEntry {
  id: string;
  timestamp: number;
  originalText: string;
  translatedText: string;
  isFinal: boolean;
  correctedFrom?: string;
  mode: InputMode;
}

// ===== 翻译会话 =====
export interface TranslationSession {
  id: string;
  mode: InputMode;
  sourceUrl?: string;
  sourceLanguage: string;
  targetLanguage: string;
  startTime: number;
  endTime?: number;
  subtitles: SubtitleEntry[];
  summary?: string;
}

// ===== AI 引擎配置 =====
export interface AIEngineConfig {
  whisper: {
    provider: 'openai';
    apiKey: string;
    model: string;
    language?: string;
  };
  translator: {
    provider: 'deepseek';
    apiKey: string;
    model: string;
    baseUrl: string;
  };
}

// ===== 字幕显示设置 =====
export interface SubtitleSettings {
  fontSize: number;
  originalColor: string;
  translatedColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  maxLines: number;
}

// ===== 音频设置 =====
export interface AudioSettings {
  inputDevice: string;
  vadSensitivity: 'low' | 'medium' | 'high';
  sampleRate: number;
}

// ===== 通用设置 =====
export interface GeneralSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
}

// ===== 应用设置 =====
export interface AppSettings {
  ai: AIEngineConfig;
  subtitle: SubtitleSettings;
  audio: AudioSettings;
  general: GeneralSettings;
}

// ===== 默认设置 =====
export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    whisper: {
      provider: 'openai',
      apiKey: '',
      model: 'whisper-1',
    },
    translator: {
      provider: 'deepseek',
      apiKey: '',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com',
    },
  },
  subtitle: {
    fontSize: 16,
    originalColor: '#ffffff',
    translatedColor: '#ffd54f',
    backgroundColor: '#000000',
    backgroundOpacity: 0.8,
    maxLines: 10,
  },
  audio: {
    inputDevice: 'default',
    vadSensitivity: 'medium',
    sampleRate: 16000,
  },
  general: {
    theme: 'dark',
    language: 'zh-CN',
  },
};
```

- [ ] **Step 2: 创建 src/shared/ipc-channels.ts**

```typescript
export const IPC_CHANNELS = {
  // yt-dlp
  YTDLP_EXTRACT_AUDIO: 'ytdlp:extract-audio',
  YTDLP_GET_INFO: 'ytdlp:get-info',
  YTDLP_CANCEL: 'ytdlp:cancel',
  YTDLP_PROGRESS: 'ytdlp:progress',

  // 系统音频
  SYSTEM_AUDIO_START: 'system-audio:start',
  SYSTEM_AUDIO_STOP: 'system-audio:stop',
  SYSTEM_AUDIO_DATA: 'system-audio:data',
  SYSTEM_AUDIO_DEVICES: 'system-audio:devices',

  // 存储
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',

  // 导出
  EXPORT_MARKDOWN: 'export:markdown',
  EXPORT_DIALOG: 'export:dialog',

  // 窗口控制
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
```

- [ ] **Step 3: 创建 src/shared/constants.ts**

```typescript
export const APP_NAME = 'AI 同声传译桌面助手';
export const APP_VERSION = '0.1.0';

// 音频常量
export const SAMPLE_RATE = 16000;
export const AUDIO_CHUNK_DURATION_SEC = 30;
export const VAD_DEFAULT_THRESHOLD_DB = -40;

// API 重试
export const API_MAX_RETRIES = 2;
export const API_RETRY_DELAY_MS = 1000;

// 字幕
export const MAX_SUBTITLE_CONTEXT = 3; // DeepSeek 翻译上下文条数
export const DEFAULT_MAX_LINES = 10;
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/
git commit -m "feat: add shared types, IPC channels, and constants"
```

---

### Task 4: 主进程入口 + 窗口管理 + Preload

**Files:**
- Create: `src/main/index.ts`
- Create: `src/main/window.ts`
- Create: `src/preload/index.ts`
- Create: `src/preload/index.d.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/electron-env.d.ts`

- [ ] **Step 1: 创建 src/main/window.ts**

```typescript
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false, // 无边框窗口，使用自定义标题栏
    titleBarStyle: 'hidden',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // 开发环境加载 dev server，生产环境加载打包文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
```

- [ ] **Step 2: 创建 src/main/index.ts**

```typescript
import { app, BrowserWindow } from 'electron';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { createMainWindow, getMainWindow } from './window';
import { IPC_CHANNELS } from '../shared/ipc-channels';

app.whenReady().then(() => {
  // 设置 app user model id (Windows)
  electronApp.setAppUserModelId('com.ai-interpreter.desktop');

  // 开发环境下默认打开 DevTools
  if (is.dev) {
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });
  }

  createMainWindow();

  // macOS: 点击 dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 窗口控制 IPC 处理
const { ipcMain } = require('electron');

ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
  getMainWindow()?.minimize();
});

ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
  const win = getMainWindow();
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
  getMainWindow()?.close();
});
```

- [ ] **Step 3: 创建 src/preload/index.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { AppSettings } from '../shared/types';

// 通过 contextBridge 暴露安全的 API 给渲染进程
const api = {
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
  },

  // 存储
  store: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key),
    set: (key: string, value: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.STORE_SET, key, value),
  },

  // yt-dlp
  ytdlp: {
    extractAudio: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.YTDLP_EXTRACT_AUDIO, url),
    getInfo: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.YTDLP_GET_INFO, url),
    cancel: () => ipcRenderer.invoke(IPC_CHANNELS.YTDLP_CANCEL),
    onProgress: (callback: (progress: number) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: number) =>
        callback(progress);
      ipcRenderer.on(IPC_CHANNELS.YTDLP_PROGRESS, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.YTDLP_PROGRESS, handler);
    },
  },

  // 系统音频
  systemAudio: {
    start: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_AUDIO_START),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_AUDIO_STOP),
    getDevices: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_AUDIO_DEVICES),
    onData: (callback: (data: ArrayBuffer) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: ArrayBuffer) =>
        callback(data);
      ipcRenderer.on(IPC_CHANNELS.SYSTEM_AUDIO_DATA, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SYSTEM_AUDIO_DATA, handler);
    },
  },

  // 导出
  exportMarkdown: (content: string, defaultName?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_MARKDOWN, content, defaultName),
};

contextBridge.exposeInMainWorld('api', api);
```

- [ ] **Step 4: 创建 src/preload/index.d.ts**

```typescript
import { AppSettings } from '../shared/types';

interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  store: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
  };
  ytdlp: {
    extractAudio: (url: string) => Promise<string>;
    getInfo: (url: string) => Promise<unknown>;
    cancel: () => Promise<void>;
    onProgress: (callback: (progress: number) => void) => () => void;
  };
  systemAudio: {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    getDevices: () => Promise<string[]>;
    onData: (callback: (data: ArrayBuffer) => void) => () => void;
  };
  exportMarkdown: (content: string, defaultName?: string) => Promise<string | null>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
```

- [ ] **Step 5: 创建 src/renderer/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com https://api.deepseek.com"
    />
    <title>AI 同声传译桌面助手</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: 创建 src/renderer/electron-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 7: 验证项目可启动**

Run:
```bash
npm run typecheck
```
Expected: 无类型错误（注意：首次运行可能需要安装 `@electron-toolkit/utils`）

如需安装缺失依赖：
```bash
npm install @electron-toolkit/utils
```

- [ ] **Step 8: Commit**

```bash
git add src/main/ src/preload/ src/renderer/index.html src/renderer/electron-env.d.ts
git commit -m "feat: add main process, window management, and preload scripts"
```

---

## Phase 2: 核心 UI 框架

### Task 5: React 入口 + 根组件 + 应用布局

**Files:**
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/components/Layout/AppLayout.tsx`
- Create: `src/renderer/src/components/Layout/TitleBar.tsx`
- Create: `src/renderer/src/components/Layout/Sidebar.tsx`

- [ ] **Step 1: 创建 src/renderer/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import App from './App';
import './assets/styles/global.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#ffd54f',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          overflow: 'hidden',
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: 创建 src/renderer/src/App.tsx**

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppLayout>
    </HashRouter>
  );
}
```

- [ ] **Step 3: 创建 src/renderer/src/components/Layout/TitleBar.tsx**

```tsx
import { Box, IconButton, Typography } from '@mui/material';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';

export default function TitleBar() {
  return (
    <Box
      className="drag"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 32,
        px: 2,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
        AI 同声传译桌面助手
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, WebkitAppRegion: 'no-drag' }}>
        <IconButton
          size="small"
          onClick={() => window.api?.window.minimize()}
          sx={{ width: 32, height: 32 }}
        >
          <MinimizeIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => window.api?.window.maximize()}
          sx={{ width: 32, height: 32 }}
        >
          <CropSquareIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => window.api?.window.close()}
          sx={{
            width: 32,
            height: 32,
            '&:hover': { bgcolor: 'error.main', color: 'white' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: 创建 src/renderer/src/components/Layout/Sidebar.tsx**

```tsx
import { Box, IconButton, Tooltip } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', icon: <TranslateIcon />, label: '翻译' },
  { path: '/history', icon: <HistoryIcon />, label: '历史' },
  { path: '/settings', icon: <SettingsIcon />, label: '设置' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        width: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 1,
        gap: 1,
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      {navItems.map((item) => (
        <Tooltip key={item.path} title={item.label} placement="right">
          <IconButton
            onClick={() => navigate(item.path)}
            sx={{
              color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
              bgcolor: location.pathname === item.path ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {item.icon}
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
}
```

- [ ] **Step 5: 创建 src/renderer/src/components/Layout/AppLayout.tsx**

```tsx
import { Box } from '@mui/material';
import { ReactNode } from 'react';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <TitleBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            bgcolor: 'background.default',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 6: 创建占位页面**

创建 `src/renderer/src/pages/HomePage.tsx`:

```tsx
import { Box } from '@mui/material';
import ModeTabs from '../components/ModeSelector/ModeTabs';
import URLInputPanel from '../components/URLInput/URLInputPanel';
import DeviceSelector from '../components/DeviceSelector/DeviceSelector';
import SubtitlePanel from '../components/Subtitle/SubtitlePanel';
import ControlBar from '../components/Common/ControlBar';
import SummaryPanel from '../components/Summary/SummaryPanel';
import { useAppStore } from '../store/appStore';

export default function HomePage() {
  const mode = useAppStore((s) => s.mode);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, gap: 2 }}>
      <ModeTabs />
      {mode === 'url' ? <URLInputPanel /> : <DeviceSelector />}
      <SubtitlePanel />
      <SummaryPanel />
      <ControlBar />
    </Box>
  );
}
```

创建 `src/renderer/src/pages/HistoryPage.tsx`:

```tsx
import { Box, Typography } from '@mui/material';

export default function HistoryPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        翻译历史
      </Typography>
      <Typography color="text.secondary">
        暂无翻译记录
      </Typography>
    </Box>
  );
}
```

创建 `src/renderer/src/pages/SettingsPage.tsx`:

```tsx
import { Box, Typography } from '@mui/material';

export default function SettingsPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        设置
      </Typography>
      <Typography color="text.secondary">
        设置功能开发中...
      </Typography>
    </Box>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/main.tsx src/renderer/src/App.tsx src/renderer/src/components/Layout/ src/renderer/src/pages/
git commit -m "feat: add React entry, App router, layout with custom title bar and sidebar"
```

---

### Task 6: Zustand Store 基础

**Files:**
- Create: `src/renderer/src/store/appStore.ts`
- Create: `src/renderer/src/store/subtitleStore.ts`
- Create: `src/renderer/src/store/settingsStore.ts`

- [ ] **Step 1: 创建 src/renderer/src/store/appStore.ts**

```typescript
import { create } from 'zustand';
import type { InputMode, AppStatus } from '@shared/types';

interface AppState {
  mode: InputMode;
  status: AppStatus;
  setMode: (mode: InputMode) => void;
  setStatus: (status: AppStatus) => void;
  startTranslation: () => void;
  stopTranslation: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'url',
  status: 'idle',

  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),

  startTranslation: () => set({ status: 'connecting' }),
  stopTranslation: () => set({ status: 'idle' }),

  reset: () => set({ mode: 'url', status: 'idle' }),
}));
```

- [ ] **Step 2: 创建 src/renderer/src/store/subtitleStore.ts**

```typescript
import { create } from 'zustand';
import type { SubtitleEntry, InputMode } from '@shared/types';

interface SubtitleState {
  entries: SubtitleEntry[];
  addEntry: (entry: SubtitleEntry) => void;
  updateEntry: (id: string, text: string) => void;
  replaceLastEntry: (entry: SubtitleEntry) => void;
  clearEntries: () => void;
  createEntry: (originalText: string, mode: InputMode) => SubtitleEntry;
}

let idCounter = 0;

function generateId(): string {
  return `sub_${Date.now()}_${++idCounter}`;
}

export const useSubtitleStore = create<SubtitleState>((set, get) => ({
  entries: [],

  addEntry: (entry) =>
    set((state) => ({ entries: [...state.entries, entry] })),

  updateEntry: (id, text) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, translatedText: text } : e
      ),
    })),

  replaceLastEntry: (entry) =>
    set((state) => {
      const entries = [...state.entries];
      if (entries.length > 0 && !entries[entries.length - 1].isFinal) {
        entries[entries.length - 1] = entry;
      } else {
        entries.push(entry);
      }
      return { entries };
    }),

  clearEntries: () => set({ entries: [] }),

  createEntry: (originalText, mode) => ({
    id: generateId(),
    timestamp: Date.now(),
    originalText,
    translatedText: '',
    isFinal: false,
    mode,
  }),
}));
```

- [ ] **Step 3: 创建 src/renderer/src/store/settingsStore.ts**

```typescript
import { create } from 'zustand';
import type { AppSettings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/types';

interface SettingsState {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateAI: (partial: Partial<AppSettings['ai']>) => void;
  updateSubtitle: (partial: Partial<AppSettings['subtitle']>) => void;
  updateAudio: (partial: Partial<AppSettings['audio']>) => void;
  loadSettings: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,

  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  updateAI: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ai: { ...state.settings.ai, ...partial } },
    })),

  updateSubtitle: (partial) =>
    set((state) => ({
      settings: {
        ...state.settings,
        subtitle: { ...state.settings.subtitle, ...partial },
      },
    })),

  updateAudio: (partial) =>
    set((state) => ({
      settings: { ...state.settings, audio: { ...state.settings.audio, ...partial } },
    })),

  loadSettings: (settings) => set({ settings }),
}));
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/store/
git commit -m "feat: add Zustand stores for app state, subtitles, and settings"
```

---

### Task 7: 模式切换 Tab + URL 输入面板

**Files:**
- Create: `src/renderer/src/components/ModeSelector/ModeTabs.tsx`
- Create: `src/renderer/src/components/URLInput/URLInputPanel.tsx`

- [ ] **Step 1: 创建 ModeTabs.tsx**

```tsx
import { Tabs, Tab, Paper } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import MicIcon from '@mui/icons-material/Mic';
import { useAppStore } from '../../store/appStore';
import type { InputMode } from '@shared/types';

const modes: { value: InputMode; label: string; icon: React.ReactElement }[] = [
  { value: 'url', label: 'URL 视频', icon: <LinkIcon fontSize="small" /> },
  { value: 'system-audio', label: '系统音频', icon: <VolumeUpIcon fontSize="small" /> },
  { value: 'microphone', label: '麦克风', icon: <MicIcon fontSize="small" /> },
];

export default function ModeTabs() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const status = useAppStore((s) => s.status);

  const currentIdx = modes.findIndex((m) => m.value === mode);

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Tabs
        value={currentIdx}
        onChange={(_, idx) => setMode(modes[idx].value)}
        variant="fullWidth"
        sx={{
          minHeight: 44,
          '& .MuiTab-root': {
            minHeight: 44,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 14,
          },
        }}
      >
        {modes.map((m) => (
          <Tab key={m.value} icon={m.icon} label={m.label} iconPosition="start" />
        ))}
      </Tabs>
    </Paper>
  );
}
```

- [ ] **Step 2: 创建 URLInputPanel.tsx**

```tsx
import { Box, TextField, Button, Paper } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useState } from 'react';
import { useAppStore } from '../../store/appStore';

export default function URLInputPanel() {
  const [url, setUrl] = useState('');
  const status = useAppStore((s) => s.status);
  const startTranslation = useAppStore((s) => s.startTranslation);
  const stopTranslation = useAppStore((s) => s.stopTranslation);

  const isRunning = status !== 'idle' && status !== 'error';

  const handleStart = () => {
    if (!url.trim()) return;
    if (isRunning) {
      stopTranslation();
    } else {
      startTranslation();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder="请输入视频 URL（YouTube、B站等）..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isRunning}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 1.5,
          },
        }}
      />
      <Button
        variant="contained"
        onClick={handleStart}
        startIcon={<PlayArrowIcon />}
        sx={{
          minWidth: 100,
          borderRadius: 1.5,
          textTransform: 'none',
          fontWeight: 600,
        }}
      >
        {isRunning ? '停止' : '开始'}
      </Button>
    </Paper>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/ModeSelector/ src/renderer/src/components/URLInput/
git commit -m "feat: add mode tabs and URL input panel"
```

---

### Task 8: 设备选择器

**Files:**
- Create: `src/renderer/src/components/DeviceSelector/DeviceSelector.tsx`

- [ ] **Step 1: 创建 DeviceSelector.tsx**

```tsx
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useAppStore } from '../../store/appStore';

// 模拟设备列表（实际从系统获取）
const mockDevices = [
  { id: 'default', name: '默认麦克风' },
  { id: 'mic-1', name: '内置麦克风' },
  { id: 'mic-2', name: 'USB 麦克风' },
];

const languages = [
  { code: 'en', name: '英文' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日文' },
  { code: 'ko', name: '韩文' },
];

export default function DeviceSelector() {
  const mode = useAppStore((s) => s.mode);
  const status = useAppStore((s) => s.status);
  const startTranslation = useAppStore((s) => s.startTranslation);
  const stopTranslation = useAppStore((s) => s.stopTranslation);

  const isRunning = status !== 'idle' && status !== 'error';
  const modeLabel = mode === 'system-audio' ? '系统音频' : '麦克风';

  const handleToggle = () => {
    if (isRunning) {
      stopTranslation();
    } else {
      startTranslation();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {mode === 'microphone' && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>麦克风</InputLabel>
            <Select label="麦克风" defaultValue="default">
              {mockDevices.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {mode === 'system-audio' && (
          <Typography variant="body2" color="text.secondary">
            将捕获系统播放的所有音频
          </Typography>
        )}

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>源语言</InputLabel>
          <Select label="源语言" defaultValue="en">
            {languages.map((l) => (
              <MenuItem key={l.code} value={l.code}>
                {l.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography color="text.secondary">→</Typography>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>目标语言</InputLabel>
          <Select label="目标语言" defaultValue="zh">
            {languages.map((l) => (
              <MenuItem key={l.code} value={l.code}>
                {l.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="contained"
          onClick={handleToggle}
          startIcon={<PlayArrowIcon />}
          sx={{
            minWidth: 100,
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {isRunning ? '停止' : '开始'}
        </Button>
      </Box>
    </Paper>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/DeviceSelector/
git commit -m "feat: add device selector for microphone and system audio modes"
```

---

### Task 9: 字幕面板组件

**Files:**
- Create: `src/renderer/src/components/Subtitle/SubtitlePanel.tsx`
- Create: `src/renderer/src/components/Subtitle/SubtitleLine.tsx`

- [ ] **Step 1: 创建 SubtitleLine.tsx**

```tsx
import { Box, Typography } from '@mui/material';
import type { SubtitleEntry } from '@shared/types';

interface SubtitleLineProps {
  entry: SubtitleEntry;
  fontSize?: number;
}

export default function SubtitleLine({ entry, fontSize = 16 }: SubtitleLineProps) {
  return (
    <Box
      sx={{
        py: 1,
        px: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        opacity: entry.isFinal ? 1 : 0.7,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontSize,
          color: 'text.secondary',
          lineHeight: 1.6,
          fontStyle: entry.isFinal ? 'normal' : 'italic',
        }}
      >
        {entry.originalText}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          fontSize: fontSize + 2,
          color: 'secondary.main',
          fontWeight: 500,
          lineHeight: 1.6,
        }}
      >
        {entry.translatedText || '...'}
      </Typography>
      {entry.correctedFrom && (
        <Typography
          variant="caption"
          sx={{ color: 'text.disabled', textDecoration: 'line-through' }}
        >
          {entry.correctedFrom}
        </Typography>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: 创建 SubtitlePanel.tsx**

```tsx
import { Box, Paper, Typography } from '@mui/material';
import { useRef, useEffect } from 'react';
import { useSubtitleStore } from '../../store/subtitleStore';
import { useSettingsStore } from '../../store/settingsStore';
import SubtitleLine from './SubtitleLine';

export default function SubtitlePanel() {
  const entries = useSubtitleStore((s) => s.entries);
  const fontSize = useSettingsStore((s) => s.settings.subtitle.fontSize);
  const maxLines = useSettingsStore((s) => s.settings.subtitle.maxLines);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const displayEntries = entries.slice(-maxLines);

  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          字幕
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {entries.length} 条
        </Typography>
      </Box>

      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        {displayEntries.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: 200,
            }}
          >
            <Typography color="text.disabled">
              开始翻译后，字幕将在此显示
            </Typography>
          </Box>
        ) : (
          displayEntries.map((entry) => (
            <SubtitleLine key={entry.id} entry={entry} fontSize={fontSize} />
          ))
        )}
      </Box>
    </Paper>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Subtitle/
git commit -m "feat: add subtitle panel and subtitle line components"
```

---

### Task 10: 控制栏 + 状态指示器 + 总结面板

**Files:**
- Create: `src/renderer/src/components/Common/ControlBar.tsx`
- Create: `src/renderer/src/components/Common/StatusBadge.tsx`
- Create: `src/renderer/src/components/Summary/SummaryPanel.tsx`

- [ ] **Step 1: 创建 StatusBadge.tsx**

```tsx
import { Chip } from '@mui/material';
import type { AppStatus } from '@shared/types';

const statusConfig: Record<
  AppStatus,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  idle: { label: '就绪', color: 'default' },
  connecting: { label: '连接中...', color: 'warning' },
  listening: { label: '监听中', color: 'primary' },
  translating: { label: '翻译中', color: 'success' },
  error: { label: '错误', color: 'error' },
};

interface StatusBadgeProps {
  status: AppStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant={status === 'idle' ? 'outlined' : 'filled'}
      sx={{ fontWeight: 600, fontSize: 12 }}
    />
  );
}
```

- [ ] **Step 2: 创建 ControlBar.tsx**

```tsx
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAppStore } from '../../store/appStore';
import { useSubtitleStore } from '../../store/subtitleStore';
import StatusBadge from './StatusBadge';

export default function ControlBar() {
  const status = useAppStore((s) => s.status);
  const entries = useSubtitleStore((s) => s.entries);

  const handleExport = async () => {
    if (!window.api) return;
    const content = entries
      .map((e) => `${e.originalText}\n${e.translatedText}\n`)
      .join('\n');
    await window.api.exportMarkdown(content, 'translation.md');
  };

  const handleCopy = () => {
    const content = entries
      .map((e) => `${e.originalText}\n${e.translatedText}`)
      .join('\n\n');
    navigator.clipboard.writeText(content);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <StatusBadge status={status} />

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="导出 Markdown">
          <span>
            <IconButton
              size="small"
              onClick={handleExport}
              disabled={entries.length === 0}
            >
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="复制全部">
          <span>
            <IconButton
              size="small"
              onClick={handleCopy}
              disabled={entries.length === 0}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: 创建 SummaryPanel.tsx**

```tsx
import { Box, Paper, Typography, IconButton, Collapse, Tooltip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useState } from 'react';

export default function SummaryPanel() {
  const [expanded, setExpanded] = useState(false);

  // 占位：AI 总结内容（Phase 5 接入）
  const summary: string | null = null;

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="subtitle2" color="text.secondary">
          AI 总结
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {summary && (
            <>
              <Tooltip title="导出">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <FileDownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="复制">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(summary);
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2, minHeight: 60 }}>
          {summary ? (
            <Typography
              variant="body2"
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                lineHeight: 1.8,
              }}
            >
              {summary}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              翻译结束后将自动生成 AI 总结
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
```

- [ ] **Step 4: 验证编译**

Run:
```bash
npm run typecheck
```
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/Common/ src/renderer/src/components/Summary/
git commit -m "feat: add control bar, status badge, and summary panel components"
```

---

## 验证清单

完成所有任务后，执行以下验证：

- [ ] `npm run typecheck` — 无类型错误
- [ ] `npm run dev` — Electron 窗口正常启动，显示完整的 UI 布局
- [ ] 点击模式切换 Tab 可切换 URL / 系统音频 / 麦克风
- [ ] URL 模式下显示输入框
- [ ] 系统音频/麦克风模式下显示设备选择器
- [ ] 字幕面板正确显示（空状态占位文字）
- [ ] AI 总结面板可折叠/展开
- [ ] 标题栏最小化/最大化/关闭按钮工作正常
- [ ] 侧边导航可切换页面（翻译/历史/设置）
