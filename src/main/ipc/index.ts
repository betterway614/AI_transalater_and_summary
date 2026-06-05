import { registerYtdlpIpc } from './ytdlp.ipc'
import { registerAudioIpc } from './audio.ipc'
import { registerExportIpc } from './export.ipc'
import { registerStoreIpc } from './store.ipc'
import { registerAuthIpc } from './auth.ipc'

export function registerAllIpc(): void {
  registerYtdlpIpc()
  registerAudioIpc()
  registerExportIpc()
  registerStoreIpc()
  registerAuthIpc()
}
