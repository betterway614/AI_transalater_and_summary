import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { execSync } from 'child_process'
import log from 'electron-log'

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

/**
 * Resolve binary path: bundled first, then PATH fallback.
 * Returns null if not found.
 */
export function resolveBinary(name: string): string | null {
  const bundled = getBinPath(name)
  if (existsSync(bundled)) return bundled

  try {
    const isWin = process.platform === 'win32'
    const cmd = isWin ? `where ${name}` : `which ${name}`
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] })
      .trim().split('\n')[0]
    if (result && existsSync(result)) {
      log.info(`[paths] Using PATH binary: ${result}`)
      return result
    }
  } catch {
    // not in PATH
  }

  return null
}
