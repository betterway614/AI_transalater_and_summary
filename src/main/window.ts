import { app, BrowserWindow, shell, session, desktopCapturer } from 'electron'
import { join } from 'path'
import log from 'electron-log'

let mainWindow: BrowserWindow | null = null

const ALLOWED_PERMISSIONS = new Set(['media', 'display-capture'])

export function createMainWindow(): BrowserWindow {
  const isDev = !app.isPackaged
  const iconPath = join(__dirname, '../../resources/icon.png')

  // Only auto-grant media & display-capture permissions
  session.defaultSession.setPermissionRequestHandler((_wc, perm, callback) => {
    const allowed = ALLOWED_PERMISSIONS.has(perm)
    if (!allowed) {
      log.warn(`[Window] Permission denied: ${perm}`)
    }
    callback(allowed)
  })

  session.defaultSession.setPermissionCheckHandler((_wc, perm, _origin) => {
    return ALLOWED_PERMISSIONS.has(perm)
  })

  // Handle getDisplayMedia() — explicitly approve so system audio loopback works
  // NOTE: useSystemPicker: false means no native picker dialog appears.
  // This is required for system audio capture to function without user interaction,
  // but means the renderer must be trusted (contextIsolation + no nodeIntegration).
  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen'] })
        const primaryScreen = sources[0]
        if (!primaryScreen) {
          log.error('[Window] No screen source found')
          callback({ video: undefined as any })
          return
        }
        log.info('[Window] getDisplayMedia approved, source:', primaryScreen.id)
        callback({ video: primaryScreen, audio: 'loopback' })
      } catch (err) {
        log.error('[Window] getDisplayMedia handler error:', err)
        callback({ video: undefined as any })
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

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      log.warn('[Window] Window not visible after 3s, forcing show')
      mainWindow.show()
      mainWindow.focus()
    }
  }, 3000)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const url = details.url
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url)
      } else {
        log.warn(`[Window] Blocked external URL with protocol: ${parsed.protocol}`)
      }
    } catch {
      log.warn(`[Window] Blocked invalid external URL: ${url}`)
    }
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
