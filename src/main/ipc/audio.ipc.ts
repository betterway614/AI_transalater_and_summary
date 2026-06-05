import { ipcMain, desktopCapturer } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { SystemAudioService } from '../services/system-audio.service'

const systemAudioService = new SystemAudioService()

export function registerAudioIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SYSTEM_AUDIO_START, async (event) => {
    try {
      systemAudioService.start((data: Buffer) => {
        event.sender.send(IPC_CHANNELS.SYSTEM_AUDIO_DATA, data.buffer)
      })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM_AUDIO_STOP, async () => {
    systemAudioService.stop()
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM_AUDIO_DEVICES, async () => {
    return systemAudioService.getDevices()
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM_AUDIO_GET_SCREEN_SOURCE, async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    if (sources.length === 0) return null
    return sources[0].id
  })
}
