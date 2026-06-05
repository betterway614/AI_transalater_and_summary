import { app, BrowserWindow, shell, session, desktopCapturer } from 'electron'
import { join } from 'path'
import log from 'electron-log'

let mainWindow: BrowserWindow | null = null

export function createMainWindow(): BrowserWindow {
  const isDev = !app.isPackaged
  const iconPath = join(__dirname, '../../resources/icon.png')

  // Auto-grant ALL Chromium permission requests (mic, display-capture, etc.)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => {
    callback(true)
  })

  // Auto-grant ALL Chromium permission checks
  session.defaultSession.setPermissionCheckHandler((_wc, _perm, _origin) => {
    return true
  })

  // Handle getDisplayMedia() auto-approval
  // MUST be synchronous — async handler causes getDisplayMedia() to hang forever
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      log.info('[Window] getDisplayMedia auto-approved (no picker)')
      // 'screen' means primary screen; 'loopback' means system audio
      callback({ video: 'screen' as any, audio: 'loopback' })
    },
    { useSystemPicker: false }
  )

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      log.warn('[Window] Window not visible after 3s, forcing show')
      mainWindow.show()
      mainWindow.focus()
    }
  }, 3000)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    log.info('[Window] Loading dev URL:', process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    log.info('[Window] Loading file:', join(__dirname, '../renderer/index.html'))
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  log.info('[Window] Window created, bounds:', JSON.stringify(mainWindow.getBounds()))

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
