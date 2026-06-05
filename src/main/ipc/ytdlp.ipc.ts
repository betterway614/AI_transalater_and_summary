import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { YtdlpService } from '../services/ytdlp.service'

const ytdlpService = new YtdlpService()

export function registerYtdlpIpc(): void {
  ipcMain.handle(IPC_CHANNELS.YTDLP_EXTRACT_AUDIO, async (event, url: string) => {
    try {
      const audioBuffer = await ytdlpService.extractAudio(
        url,
        (progress) => {
          event.sender.send(IPC_CHANNELS.YTDLP_PROGRESS, progress)
        }
      )
      return { success: true, data: audioBuffer.buffer }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.YTDLP_GET_INFO, async (_event, url: string) => {
    try {
      return await ytdlpService.getVideoInfo(url)
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.YTDLP_CANCEL, async () => {
    ytdlpService.cancel()
  })
}
