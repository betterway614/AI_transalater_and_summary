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
    extractAudio: (url: string) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>
    getInfo: (url: string) => Promise<unknown>
    cancel: () => Promise<void>
    onProgress: (callback: (progress: number) => void) => () => void
  }
  systemAudio: {
    start: () => Promise<void>
    stop: () => Promise<void>
    getDevices: () => Promise<string[]>
    onData: (callback: (data: ArrayBuffer) => void) => () => void
  }
  exportMarkdown: (content: string, defaultName?: string) => Promise<string | null>
}

declare interface Window {
  api: ElectronAPI
}
