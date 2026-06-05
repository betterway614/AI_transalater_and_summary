import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import { join } from 'path'
import log from 'electron-log'

let tray: Tray | null = null

export function createTray(getWindow: () => BrowserWindow | null): Tray {
  // Use a simple 16x16 icon created from the app icon
  const iconPath = join(__dirname, '../../resources/icon.png')
  let icon: Electron.NativeImage

  try {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty()
    }
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        const win = getWindow()
        if (win) {
          win.show()
          win.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        tray?.destroy()
        tray = null
        const { app } = require('electron')
        app.quit()
      }
    }
  ])

  tray.setToolTip('VoiceBridge · 语桥')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    const win = getWindow()
    if (win) {
      win.show()
      win.focus()
    }
  })

  log.info('[Tray] System tray created')
  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
