import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { YtdlpService } from '../services/ytdlp.service'

let _ytdlp: YtdlpService | null = null
function getYtdlp(): YtdlpService {
  if (!_ytdlp) _ytdlp = new YtdlpService()
  return _ytdlp
}

export function registerYtdlpIpc(): void {
  ipcMain.handle(IPC_CHANNELS.YTDLP_EXTRACT_AUDIO, async (event, url: string, partIndex?: number, cookiesPath?: string) => {
    try {
      const audioBuffer = await getYtdlp().extractAudio(
        { url, partIndex, cookiesPath },
        (progress) => {
          event.sender.send(IPC_CHANNELS.YTDLP_PROGRESS, progress)
        }
      )
      // Use Buffer.from() to create a clean copy — avoids Buffer pool byteOffset issues
      const cleanBuffer = Buffer.from(audioBuffer)
      return { success: true, data: cleanBuffer.buffer.slice(cleanBuffer.byteOffset, cleanBuffer.byteOffset + cleanBuffer.byteLength) }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.YTDLP_GET_INFO, async (_event, url: string) => {
    try {
      return await getYtdlp().getVideoInfo(url)
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.YTDLP_CANCEL, async () => {
    getYtdlp().cancel()
  })

  ipcMain.handle(IPC_CHANNELS.YTDLP_SET_COOKIES, async (_event, path: string | null) => {
    getYtdlp().setCookies(path)
  })
}
