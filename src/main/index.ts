import { app, BrowserWindow, ipcMain } from 'electron'
import { createMainWindow, getMainWindow } from './window'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { registerAllIpc } from './ipc'
import { createTray } from './tray'
import { destroyFloatingWindow } from './floating-subtitle'
import log from 'electron-log'

app.whenReady().then(() => {
  const isDev = !app.isPackaged

  log.info('[Main] App ready, isDev:', isDev)

  app.setAppUserModelId('com.voicebridge.desktop')

  if (isDev) {
    app.on('browser-window-created', (_, window) => {
      window.webContents.on('before-input-event', (_, input) => {
        if (input.key === 'F12') {
          window.webContents.toggleDevTools()
        }
      })
    })
  }

  createMainWindow()
  createTray(getMainWindow)

  // Register all IPC handlers
  registerAllIpc()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  destroyFloatingWindow()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 窗口控制 IPC
ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
  getMainWindow()?.minimize()
})

ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
  const win = getMainWindow()
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
  getMainWindow()?.close()
})

// 渲染进程日志 -> 终端（绕过 DevTools 可见性问题）
ipcMain.on(IPC_CHANNELS.RENDERER_LOG, (_event, level: string, ...args: unknown[]) => {
  const ts = new Date().toISOString().slice(11, 23)
  const prefix = `[Renderer ${ts}]`
  switch (level) {
    case 'error': log.error(prefix, ...args); break
    case 'warn': log.warn(prefix, ...args); break
    default: log.info(prefix, ...args); break
  }
})
