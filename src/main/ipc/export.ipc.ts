import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { writeFileSync } from 'fs'

export function registerExportIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.EXPORT_MARKDOWN,
    async (_event, content: string, defaultName?: string) => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return null

      const result = await dialog.showSaveDialog(win, {
        title: '导出 Markdown',
        defaultPath: defaultName || 'translation.md',
        filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'All Files', extensions: ['*'] }]
      })

      if (!result.canceled && result.filePath) {
        writeFileSync(result.filePath, content, 'utf-8')
        return result.filePath
      }
      return null
    }
  )
}
