interface ElectronAPI {
  logToMain: (level: 'info' | 'warn' | 'error', ...args: unknown[]) => void
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  floating: {
    show: () => Promise<boolean>
    hide: () => Promise<boolean>
    updateSubtitles: (entries: import('../shared/types').SubtitleEntry[]) => Promise<boolean>
    updateTheme: (theme: string) => Promise<boolean>
    setExpanded: (expanded: boolean) => void
    onSubtitlesUpdate: (callback: (entries: import('../shared/types').SubtitleEntry[]) => void) => () => void
    onThemeUpdate: (callback: (theme: string) => void) => () => void
    updateSummary: (summary: string | null) => Promise<boolean>
    onSummaryUpdate: (callback: (summary: string | null) => void) => () => void
    updateSubtitleSettings: (settings: import('../shared/types').SubtitleSettings) => Promise<boolean>
    onSubtitleSettingsUpdate: (callback: (settings: import('../shared/types').SubtitleSettings) => void) => () => void
    setDisplayMode: (mode: string) => void
    onDisplayModeChange: (callback: (mode: string) => void) => () => void
  }
  store: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<{ success: boolean; error?: string }>
    getSecret: (key: string) => Promise<string | null>
    setSecret: (key: string, value: string) => Promise<void>
    getStats: () => Promise<{
      domains: Record<string, { fileSize: number; exists: boolean }>
      historyCount: number
      oldestSessionTime: number | null
      totalSize: number
    }>
    cleanup: (keepDays: number) => Promise<void>
  }
  ytdlp: {
    extractAudio: (url: string, partIndex?: number, cookiesPath?: string) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>
    getInfo: (url: string) => Promise<import('../shared/types').VideoInfo | { error: string }>
    cancel: () => Promise<void>
    setCookies: (path: string | null) => Promise<void>
    onProgress: (callback: (progress: number) => void) => () => void
  }
  systemAudio: {
    start: () => Promise<void>
    stop: () => Promise<void>
    getDevices: () => Promise<string[]>
    getScreenSource: () => Promise<string | null>
    onData: (callback: (data: ArrayBuffer) => void) => () => void
    onError: (callback: (error: string) => void) => () => void
  }
  exportMarkdown: (content: string, defaultName?: string) => Promise<string | null>
  auth: {
    login: (platformId: string) => Promise<{ success: boolean; error?: string }>
    getLoggedIn: () => Promise<string[]>
    getCookies: (platformId: string) => Promise<string | null>
    logout: (platformId: string) => Promise<void>
    detectPlatform: (url: string) => Promise<string | null>
    getPlatforms: () => Promise<{ id: string; name: string }[]>
  }
  ai: {
    transcribe: (config: {
      baseUrl: string; apiKey: string; model: string; language: string
      audioData: ArrayBuffer
    }) => Promise<{ text: string }>
    chatCompletion: (config: {
      baseUrl: string; apiKey: string; model: string
      messages: Array<{ role: string; content: string }>
      temperature?: number; maxTokens?: number
    }) => Promise<{ text: string }>
    testConnection: (config: {
      baseUrl: string; apiKey: string
    }) => Promise<{ ok: boolean; status: number; statusText: string }>
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
