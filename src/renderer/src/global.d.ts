interface ElectronAPI {
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  store: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
  }
  ytdlp: {
    extractAudio: (url: string, partIndex?: number, cookiesPath?: string) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>
    getInfo: (url: string) => Promise<import('@shared/types').VideoInfo | { error: string }>
    cancel: () => Promise<void>
    setCookies: (path: string | null) => Promise<void>
    onProgress: (callback: (progress: number) => void) => () => void
  }
  systemAudio: {
    start: () => Promise<void>
    stop: () => Promise<void>
    getDevices: () => Promise<string[]>
    onData: (callback: (data: ArrayBuffer) => void) => () => void
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
}

declare interface Window {
  api: ElectronAPI
}

declare module '*.svg' {
  const src: string
  export default src
}
