import { ipcMain } from 'electron'
import Store from 'electron-store'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import log from 'electron-log'

const store = new Store()

export function registerStoreIpc(): void {
  ipcMain.handle(IPC_CHANNELS.STORE_GET, (_event, key: string) => {
    try {
      const value = store.get(key)
      log.debug(`[Store] GET "${key}" -> exists=${value != null}`)
      return value
    } catch (err) {
      log.error(`[Store] GET "${key}" failed:`, err)
      return undefined
    }
  })

  ipcMain.handle(IPC_CHANNELS.STORE_SET, (_event, key: string, value: unknown) => {
    try {
      store.set(key, value)
      // Write-verify: read back to confirm
      const readback = store.get(key)
      const hasData = readback != null
      log.debug(`[Store] SET "${key}" -> saved, verify=${hasData}`)
      return { success: true }
    } catch (err) {
      log.error(`[Store] SET "${key}" failed:`, err)
      return { success: false, error: String(err) }
    }
  })
}
