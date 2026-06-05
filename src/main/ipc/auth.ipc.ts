import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import {
  openLoginWindow,
  getLoggedInPlatforms,
  getCookiesForPlatform,
  clearPlatformCookies,
  detectPlatformCookies,
  PLATFORMS
} from '../services/auth.service'

export function registerAuthIpc(): void {
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_event, platformId: string) => {
    return openLoginWindow(platformId)
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_GET_LOGGED_IN, async () => {
    return getLoggedInPlatforms()
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_GET_COOKIES, async (_event, platformId: string) => {
    return getCookiesForPlatform(platformId)
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async (_event, platformId: string) => {
    clearPlatformCookies(platformId)
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_DETECT_PLATFORM, async (_event, url: string) => {
    return detectPlatformCookies(url)
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_GET_PLATFORMS, async () => {
    return PLATFORMS.map(({ id, name }) => ({ id, name }))
  })
}
