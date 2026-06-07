import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { getMainWindow } from './window'
import type { SubtitleEntry, SubtitleSettings } from '../shared/types'

let floatingWindow: BrowserWindow | null = null
let subtitleCache: SubtitleEntry[] = []
let themeCache: string = 'dark'
let summaryCache: string | null = null
let subtitleSettingsCache: SubtitleSettings | null = null

const COMPACT_H = 36
const EXPANDED_H = 240

export function createFloatingSubtitleWindow(): BrowserWindow {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.show()
    floatingWindow.focus()
    return floatingWindow
  }

  const display = screen.getPrimaryDisplay()
  const { width: screenW, height: screenH } = display.workAreaSize

  const winW = 360
  const winH = COMPACT_H

  floatingWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: Math.round((screenW - winW) / 2),
    y: screenH - winH - 48,
    minWidth: 200,
    minHeight: COMPACT_H,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  const isDev = !require('electron').app.isPackaged
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    floatingWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/floating.html`)
  } else {
    floatingWindow.loadFile(join(__dirname, '../renderer/floating.html'))
  }

  floatingWindow.on('ready-to-show', () => {
    floatingWindow?.show()
    if (subtitleCache.length > 0) {
      floatingWindow?.webContents.send(IPC_CHANNELS.FLOATING_UPDATE_SUBTITLES, subtitleCache)
    }
    floatingWindow?.webContents.send(IPC_CHANNELS.FLOATING_UPDATE_THEME, themeCache)
    if (summaryCache) {
      floatingWindow?.webContents.send(IPC_CHANNELS.FLOATING_UPDATE_SUMMARY, summaryCache)
    }
    if (subtitleSettingsCache) {
      floatingWindow?.webContents.send(IPC_CHANNELS.FLOATING_UPDATE_SUBTITLE_SETTINGS, subtitleSettingsCache)
    }
  })

  floatingWindow.on('closed', () => {
    floatingWindow = null
  })

  return floatingWindow
}

export function getFloatingWindow(): BrowserWindow | null {
  return floatingWindow
}

export function destroyFloatingWindow(): void {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.destroy()
  }
  floatingWindow = null
}

export function isFloatingVisible(): boolean {
  return floatingWindow !== null && !floatingWindow.isDestroyed() && floatingWindow.isVisible()
}

export function sendSubtitlesToFloat(entries: SubtitleEntry[]): void {
  subtitleCache = entries
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.webContents.send(IPC_CHANNELS.FLOATING_UPDATE_SUBTITLES, entries)
  }
}

export function sendThemeToFloat(theme: string): void {
  themeCache = theme
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.webContents.send(IPC_CHANNELS.FLOATING_UPDATE_THEME, theme)
  }
}

export function sendSummaryToFloat(summary: string | null): void {
  summaryCache = summary
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.webContents.send(IPC_CHANNELS.FLOATING_UPDATE_SUMMARY, summary)
  }
}

export function sendSubtitleSettingsToFloat(settings: SubtitleSettings): void {
  subtitleSettingsCache = settings
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.webContents.send(IPC_CHANNELS.FLOATING_UPDATE_SUBTITLE_SETTINGS, settings)
  }
}

export function registerFloatingIpc(): void {
  ipcMain.handle(IPC_CHANNELS.FLOATING_SHOW, () => {
    createFloatingSubtitleWindow()
    return true
  })

  ipcMain.handle(IPC_CHANNELS.FLOATING_HIDE, () => {
    destroyFloatingWindow()
    return true
  })

  ipcMain.handle(IPC_CHANNELS.FLOATING_SUBTITLES_FROM_RENDERER, (_event, entries: SubtitleEntry[]) => {
    sendSubtitlesToFloat(entries)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.FLOATING_THEME_FROM_RENDERER, (_event, theme: string) => {
    sendThemeToFloat(theme)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.FLOATING_SUMMARY_FROM_RENDERER, (_event, summary: string | null) => {
    sendSummaryToFloat(summary)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.FLOATING_SUBTITLE_SETTINGS_FROM_RENDERER, (_event, settings: SubtitleSettings) => {
    sendSubtitleSettingsToFloat(settings)
    return true
  })

  // Resize floating window between compact / expanded
  ipcMain.on(IPC_CHANNELS.FLOATING_SET_EXPANDED, (_event, expanded: boolean) => {
    if (!floatingWindow || floatingWindow.isDestroyed()) return
    const display = screen.getPrimaryDisplay()
    const { width: screenW, height: screenH } = display.workAreaSize
    const bounds = floatingWindow.getBounds()
    const targetH = expanded ? EXPANDED_H : COMPACT_H
    floatingWindow.setBounds({
      x: bounds.x,
      y: screenH - targetH - 48,
      width: bounds.width,
      height: targetH
    }, true)
  })

  // Forward display mode change from floating window to main window
  ipcMain.on(IPC_CHANNELS.FLOATING_SET_DISPLAY_MODE, (_event, mode: string) => {
    const mainWin = getMainWindow()
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send(IPC_CHANNELS.FLOATING_DISPLAY_MODE_CHANGED, mode)
    }
  })
}
