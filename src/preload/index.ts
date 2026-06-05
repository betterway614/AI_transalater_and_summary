import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'

const api = {
  window: {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE)
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
    onData: (callback: (data: ArrayBuffer) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: ArrayBuffer) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.SYSTEM_AUDIO_DATA, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SYSTEM_AUDIO_DATA, handler)
    }
  },

  exportMarkdown: (content: string, defaultName?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_MARKDOWN, content, defaultName)
}

contextBridge.exposeInMainWorld('api', api)
