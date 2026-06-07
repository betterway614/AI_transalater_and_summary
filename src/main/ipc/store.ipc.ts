import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { storeService } from '../services/store.service'
import log from 'electron-log'

/**
 * Map a flat key to its domain + internal key.
 *
 * Mapping:
 *   settings          → domain=settings, key=config
 *   history.sessions  → domain=history,  key=sessions
 *   session.snapshot  → domain=session,  key=snapshot
 *   summary           → domain=session,  key=summary
 */
function resolveDomainAndKey(
  flatKey: string,
): { domain: 'settings' | 'history' | 'session' | 'secrets'; key: string } | null {
  // Domain-prefixed keys (e.g. "history.sessions")
  const dotIndex = flatKey.indexOf('.')
  if (dotIndex > 0) {
    const domain = flatKey.slice(0, dotIndex) as 'history' | 'session' | 'secrets'
    const key = flatKey.slice(dotIndex + 1)
    if (['history', 'session', 'secrets'].includes(domain)) {
      return { domain, key }
    }
  }

  // Unprefixed keys
  if (flatKey === 'settings') return { domain: 'settings', key: 'config' }
  if (flatKey === 'summary') return { domain: 'session', key: 'summary' }

  return null
}

export function registerStoreIpc(): void {
  try {
    storeService.init()
    log.info('[IPC] StoreService initialized')

    // One-time migration from legacy config.json
    const migrated = storeService.migrateFromLegacy()
    if (migrated) {
      log.info('[IPC] Legacy data migrated to new domain-split layout')
    }
  } catch (err) {
    log.error('[IPC] StoreService init failed:', err)
  }

  // ── GET ──────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.STORE_GET, (_event, key: string) => {
    const resolved = resolveDomainAndKey(key)
    if (!resolved) {
      log.warn(`[Store] GET "${key}" — unknown key, returning undefined`)
      return undefined
    }
    const value = storeService.get(resolved.domain, resolved.key)
    log.debug(`[Store] GET "${key}" (${resolved.domain}.${resolved.key}) -> exists=${value != null}`)
    return value
  })

  // ── SET ──────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.STORE_SET, (_event, key: string, value: unknown) => {
    const resolved = resolveDomainAndKey(key)
    if (!resolved) {
      log.warn(`[Store] SET "${key}" — unknown key`)
      return { success: false, error: `Unknown storage key: ${key}` }
    }
    return storeService.set(resolved.domain, resolved.key, value)
  })

  // ── SECRETS ──────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.STORE_GET_SECRET, (_event, key: string) => {
    return storeService.getSecret(key)
  })

  ipcMain.handle(IPC_CHANNELS.STORE_SET_SECRET, (_event, key: string, value: string) => {
    return storeService.setSecret(key, value)
  })

  // ── STATS ────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.STORE_GET_STATS, () => {
    return storeService.getStorageStats()
  })

  // ── CLEANUP ──────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.STORE_CLEANUP, (_event, keepDays: number) => {
    return storeService.cleanupOldSessions(keepDays)
  })
}
