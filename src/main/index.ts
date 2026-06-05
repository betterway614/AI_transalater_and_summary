import { app, BrowserWindow, ipcMain } from 'electron'
import { createMainWindow, getMainWindow } from './window'
import { IPC_CHANNELS } from '../shared/ipc-channels'

app.whenReady().then(() => {
  const isDev = !app.isPackaged

  app.setAppUserModelId('com.ai-interpreter.desktop')

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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
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
