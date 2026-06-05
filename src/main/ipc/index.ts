import { registerYtdlpIpc } from './ytdlp.ipc'
import { registerAudioIpc } from './audio.ipc'
import { registerExportIpc } from './export.ipc'
import { registerStoreIpc } from './store.ipc'
import { registerAuthIpc } from './auth.ipc'
import { registerAiIpc } from './ai.ipc'
import { registerFloatingIpc } from '../floating-subtitle'
import log from 'electron-log'

export function registerAllIpc(): void {
  log.info('[IPC] Registering all IPC handlers...')
  const modules = [
    { name: 'ytdlp', fn: registerYtdlpIpc },
    { name: 'audio', fn: registerAudioIpc },
    { name: 'export', fn: registerExportIpc },
    { name: 'store', fn: registerStoreIpc },
    { name: 'auth', fn: registerAuthIpc },
    { name: 'ai', fn: registerAiIpc },
    { name: 'floating', fn: registerFloatingIpc },
  ]
  for (const { name, fn } of modules) {
    try {
      fn()
      log.info(`[IPC] ${name} registered`)
    } catch (err) {
      log.error(`[IPC] ${name} FAILED:`, err)
    }
  }
  log.info('[IPC] All handlers registered')
}
