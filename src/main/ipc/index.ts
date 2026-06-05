import { registerYtdlpIpc } from './ytdlp.ipc'
import { registerAudioIpc } from './audio.ipc'
import { registerExportIpc } from './export.ipc'
import { registerStoreIpc } from './store.ipc'

export function registerAllIpc(): void {
  registerYtdlpIpc()
  registerAudioIpc()
  registerExportIpc()
  registerStoreIpc()
}
