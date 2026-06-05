import { app } from 'electron'
import { join } from 'path'

/**
 * Get path to bundled resource files (binaries, etc.)
 */
export function getResourcePath(...segments: string[]): string {
  const isDev = !app.isPackaged
  const base = isDev
    ? join(__dirname, '../../resources')
    : join(process.resourcesPath)
  return join(base, ...segments)
}

/**
 * Get path to binary in resources/bin/
 */
export function getBinPath(name: string): string {
  return getResourcePath('bin', name)
}
