import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { SubtitleEntry, SubtitleSettings } from '../shared/types'

const api = {
  // 渲染进程 -> 主进程终端日志（绕过 DevTools 可见性问题）
  logToMain: (level: 'info' | 'warn' | 'error', ...args: unknown[]) =>
    ipcRenderer.send(IPC_CHANNELS.RENDERER_LOG, level, ...args),

  window: {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE)
  },

  floating: {
    show: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.FLOATING_SHOW),
    hide: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.FLOATING_HIDE),
    updateSubtitles: (entries: SubtitleEntry[]): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOATING_SUBTITLES_FROM_RENDERER, entries),
    updateTheme: (theme: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOATING_THEME_FROM_RENDERER, theme),
    setExpanded: (expanded: boolean) => {
      ipcRenderer.send(IPC_CHANNELS.FLOATING_SET_EXPANDED, expanded)
    },
    onSubtitlesUpdate: (callback: (entries: SubtitleEntry[]) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, entries: SubtitleEntry[]) => callback(entries)
      ipcRenderer.on(IPC_CHANNELS.FLOATING_UPDATE_SUBTITLES, handler)
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.FLOATING_UPDATE_SUBTITLES, handler) }
    },
    onThemeUpdate: (callback: (theme: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, theme: string) => callback(theme)
      ipcRenderer.on(IPC_CHANNELS.FLOATING_UPDATE_THEME, handler)
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.FLOATING_UPDATE_THEME, handler) }
    },
    updateSummary: (summary: string | null): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOATING_SUMMARY_FROM_RENDERER, summary),
    onSummaryUpdate: (callback: (summary: string | null) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, summary: string | null) => callback(summary)
      ipcRenderer.on(IPC_CHANNELS.FLOATING_UPDATE_SUMMARY, handler)
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.FLOATING_UPDATE_SUMMARY, handler) }
    },
    updateSubtitleSettings: (settings: SubtitleSettings): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOATING_SUBTITLE_SETTINGS_FROM_RENDERER, settings),
    onSubtitleSettingsUpdate: (callback: (settings: SubtitleSettings) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, settings: SubtitleSettings) => callback(settings)
      ipcRenderer.on(IPC_CHANNELS.FLOATING_UPDATE_SUBTITLE_SETTINGS, handler)
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.FLOATING_UPDATE_SUBTITLE_SETTINGS, handler) }
    },
    setDisplayMode: (mode: string) => {
      ipcRenderer.send(IPC_CHANNELS.FLOATING_SET_DISPLAY_MODE, mode)
    },
    onDisplayModeChange: (callback: (mode: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, mode: string) => callback(mode)
      ipcRenderer.on(IPC_CHANNELS.FLOATING_DISPLAY_MODE_CHANGED, handler)
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.FLOATING_DISPLAY_MODE_CHANGED, handler) }
    }
  },

  store: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key),
    set: (key: string, value: unknown) => ipcRenderer.invoke(IPC_CHANNELS.STORE_SET, key, value)
  },

  ytdlp: {
    extractAudio: (url: string, partIndex?: number, cookiesPath?: string): Promise<{ success: boolean; data?: ArrayBuffer; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.YTDLP_EXTRACT_AUDIO, url, partIndex, cookiesPath),
    getInfo: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.YTDLP_GET_INFO, url),
    cancel: () => ipcRenderer.invoke(IPC_CHANNELS.YTDLP_CANCEL),
    setCookies: (path: string | null) => ipcRenderer.invoke(IPC_CHANNELS.YTDLP_SET_COOKIES, path),
    onProgress: (callback: (progress: number) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: number) => callback(progress)
      ipcRenderer.on(IPC_CHANNELS.YTDLP_PROGRESS, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.YTDLP_PROGRESS, handler)
    }
  },

  systemAudio: {
    start: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_AUDIO_START),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_AUDIO_STOP),
    getDevices: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_AUDIO_DEVICES),
    getScreenSource: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_AUDIO_GET_SCREEN_SOURCE),
    onData: (callback: (data: ArrayBuffer) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: ArrayBuffer) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.SYSTEM_AUDIO_DATA, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SYSTEM_AUDIO_DATA, handler)
    },
    onError: (callback: (error: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
      ipcRenderer.on(IPC_CHANNELS.SYSTEM_AUDIO_ERROR, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SYSTEM_AUDIO_ERROR, handler)
    }
  },

  exportMarkdown: (content: string, defaultName?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_MARKDOWN, content, defaultName),

  auth: {
    login: (platformId: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, platformId),
    getLoggedIn: (): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_LOGGED_IN),
    getCookies: (platformId: string): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_COOKIES, platformId),
    logout: (platformId: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT, platformId),
    detectPlatform: (url: string): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.AUTH_DETECT_PLATFORM, url),
    getPlatforms: (): Promise<{ id: string; name: string }[]> => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_PLATFORMS),
  },

  ai: {
    transcribe: (config: {
      baseUrl: string; apiKey: string; model: string; language: string;
      audioData: ArrayBuffer;
    }): Promise<{ text: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_WHISPER_TRANSCRIBE, config),

    chatCompletion: (config: {
      baseUrl: string; apiKey: string; model: string;
      messages: Array<{ role: string; content: string }>;
      temperature?: number; maxTokens?: number;
    }): Promise<{ text: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT_COMPLETION, config),

    testConnection: (config: {
      baseUrl: string; apiKey: string;
    }): Promise<{ ok: boolean; status: number; statusText: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_TEST_CONNECTION, config),
  }
}

contextBridge.exposeInMainWorld('api', api)
