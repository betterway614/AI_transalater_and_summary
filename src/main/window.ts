import { app, BrowserWindow, shell, session, desktopCapturer } from 'electron'
import { join } from 'path'
import log from 'electron-log'

let mainWindow: BrowserWindow | null = null

export function createMainWindow(): BrowserWindow {
  const isDev = !app.isPackaged
  const iconPath = join(__dirname, '../../resources/icon.png')

  // Layer 1: Auto-grant Chromium permission requests (microphone, display-capture, etc.)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => {
    callback(true)
  })

  // Layer 2: Auto-grant Chromium permission CHECKS (synchronous, runs before handler)
  session.defaultSession.setPermissionCheckHandler((_wc, _perm, _origin) => {
    return true
  })

  // Auto-approve getDisplayMedia() — provide screen source + system audio loopback
  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      log.info('[Window] setDisplayMediaRequestHandler called')
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen'] })
        log.info('[Window] Screen sources found:', sources.length)
        if (sources.length > 0) {
          log.info('[Window] Approving with source:', sources[0].id, 'audio: loopback')
          callback({ video: sources[0], audio: 'loopback' })
        } else {
          log.warn('[Window] No screen sources found')
          callback({})
        }
      } catch (err) {
        log.error('[Window] setDisplayMediaRequestHandler error:', err)
        callback({})
      }
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

  // Fallback: ensure window is visible after 3 seconds
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
