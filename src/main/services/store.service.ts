import Store from 'electron-store'
import { safeStorage } from 'electron'
import log from 'electron-log'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { runMigrations } from './migrations'

// ── Domain config ──────────────────────────────────────────────
type DomainName = 'settings' | 'history' | 'session' | 'secrets'

interface DomainConfig {
  name: DomainName
  schemaVersion: number
}

const DOMAINS: Record<DomainName, DomainConfig> = {
  settings: { name: 'settings', schemaVersion: 1 },
  history: { name: 'history', schemaVersion: 1 },
  session: { name: 'session', schemaVersion: 1 },
  secrets: { name: 'secrets', schemaVersion: 1 },
}

// ── Types ──────────────────────────────────────────────────────
export interface StorageStats {
  domains: Record<string, { fileSize: number; exists: boolean }>
  historyCount: number
  oldestSessionTime: number | null
  totalSize: number
}

// ── Write queue ────────────────────────────────────────────────
type QueueOp = () => Promise<void>

// ── Service ────────────────────────────────────────────────────
class StoreService {
  private stores = new Map<DomainName, Store>()
  private _writeQueue: Promise<void> = Promise.resolve()
  private _initialized = false
  private userDataPath: string

  constructor() {
    this.userDataPath = app.getPath('userData')
  }

  // ── Init ─────────────────────────────────────────────────────

  /** Initialize all domain stores. Call once at app startup. */
  init(): void {
    if (this._initialized) return

    log.info('[StoreService] Initializing...')

    for (const [domain, config] of Object.entries(DOMAINS) as [DomainName, DomainConfig][]) {
      try {
        const store = new Store({ name: config.name })
        this.stores.set(domain, store)

        // Run pending schema migrations
        try {
          const applied = runMigrations(domain, store)
          if (applied > 0) {
            log.info(`[StoreService] Domain "${domain}" — applied ${applied} migration(s)`)
          }
        } catch (migErr) {
          log.error(`[StoreService] Migration failed for "${domain}":`, migErr)
        }

        log.info(`[StoreService] Domain "${domain}" initialized (v${config.schemaVersion})`)
      } catch (err) {
        log.error(`[StoreService] Failed to init "${domain}", recreating...`, err)
        this.recreateStore(domain)
      }
    }

    this._initialized = true
    log.info('[StoreService] All domains initialized')
  }

  private recreateStore(domain: DomainName): void {
    try {
      const config = DOMAINS[domain]
      const filePath = path.join(this.userDataPath, `${config.name}.json`)
      // Back up corrupted file
      if (fs.existsSync(filePath)) {
        const backupPath = filePath + `.corrupted.${Date.now()}.bak`
        fs.renameSync(filePath, backupPath)
        log.warn(`[StoreService] Corrupted ${config.name}.json backed up as ${backupPath}`)
      }
    } catch (_) {
      // best effort backup
    }
    try {
      const store = new Store({ name: DOMAINS[domain].name })
      this.stores.set(domain, store)
      log.info(`[StoreService] Domain "${domain}" recreated from scratch`)
    } catch (err) {
      log.error(`[StoreService] CRITICAL: Cannot create store for "${domain}"`, err)
    }
  }

  // ── Read ─────────────────────────────────────────────────────

  get(domain: DomainName, key: string): unknown {
    const store = this.stores.get(domain)
    if (!store) return undefined
    try {
      return store.get(key)
    } catch (err) {
      log.error(`[StoreService] GET ${domain}.${key} failed:`, err)
      return undefined
    }
  }

  // ── Write (queued) ───────────────────────────────────────────

  set(domain: DomainName, key: string, value: unknown): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.enqueue(async () => {
        const store = this.stores.get(domain)
        if (!store) {
          resolve({ success: false, error: `Domain "${domain}" not initialized` })
          return
        }
        try {
          store.set(key, value)
          const readback = store.get(key)
          const hasData = readback !== undefined && readback !== null
          log.debug(`[StoreService] SET ${domain}.${key} -> verify=${hasData}`)
          resolve({ success: true })
        } catch (err) {
          log.error(`[StoreService] SET ${domain}.${key} failed:`, err)
          resolve({ success: false, error: String(err) })
        }
      })
    })
  }

  // ── Secrets (safeStorage) ────────────────────────────────────

  getSecret(key: string): string | null {
    try {
      const store = this.stores.get('secrets')
      if (!store) return null
      const encoded = store.get(key) as string | undefined
      if (!encoded) return null

      // Handle plaintext fallback (safeStorage unavailable on some Linux setups)
      if (encoded.startsWith('__plain__')) {
        return encoded.slice(9)
      }

      if (!safeStorage.isEncryptionAvailable()) return null
      return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
    } catch (err) {
      log.error(`[StoreService] GET_SECRET ${key} failed:`, err)
      return null
    }
  }

  async setSecret(key: string, value: string): Promise<void> {
    return new Promise((resolve) => {
      this.enqueue(async () => {
        try {
          if (!safeStorage.isEncryptionAvailable()) {
            log.warn('[StoreService] safeStorage unavailable, storing secret as plaintext (fallback)')
            const store = this.stores.get('secrets')
            if (store) {
              // Fallback: store with basic obfuscation marker
              store.set(key, `__plain__${value}`)
            }
          } else {
            const encrypted = safeStorage.encryptString(value)
            const store = this.stores.get('secrets')
            if (store) {
              store.set(key, encrypted.toString('base64'))
            }
          }
          log.debug(`[StoreService] SET_SECRET ${key} -> saved`)
          resolve()
        } catch (err) {
          log.error(`[StoreService] SET_SECRET ${key} failed:`, err)
          resolve()
        }
      })
    })
  }

  // ── Version info ─────────────────────────────────────────────

  getDomainVersion(domain: DomainName): number {
    return DOMAINS[domain].schemaVersion
  }

  // ── Storage stats ────────────────────────────────────────────

  getStorageStats(): StorageStats {
    const stats: StorageStats = {
      domains: {},
      historyCount: 0,
      oldestSessionTime: null,
      totalSize: 0,
    }

    for (const domain of Object.keys(DOMAINS) as DomainName[]) {
      const filePath = path.join(this.userDataPath, `${DOMAINS[domain].name}.json`)
      try {
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath)
          stats.domains[domain] = { fileSize: stat.size, exists: true }
          stats.totalSize += stat.size
        } else {
          stats.domains[domain] = { fileSize: 0, exists: false }
        }
      } catch {
        stats.domains[domain] = { fileSize: 0, exists: false }
      }
    }

    // History metadata
    try {
      const sessions = this.get('history', 'sessions') as any[]
      if (Array.isArray(sessions) && sessions.length > 0) {
        stats.historyCount = sessions.length
        const timestamps = sessions
          .map((s) => s.startTime)
          .filter((t): t is number => typeof t === 'number' && t > 0)
        if (timestamps.length > 0) {
          stats.oldestSessionTime = Math.min(...timestamps)
        }
      }
    } catch {
      // ignore
    }

    return stats
  }

  // ── Cleanup ──────────────────────────────────────────────────

  async cleanupOldSessions(keepDays: number): Promise<void> {
    return new Promise((resolve) => {
      this.enqueue(async () => {
        try {
          const sessions = this.get('history', 'sessions') as any[]
          if (!Array.isArray(sessions) || sessions.length === 0) {
            log.info('[StoreService] No sessions to clean up')
            resolve()
            return
          }
          const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000
          const kept = sessions.filter(
            (s) => typeof s.startTime === 'number' && s.startTime >= cutoff,
          )
          const removed = sessions.length - kept.length
          if (removed > 0) {
            const store = this.stores.get('history')
            if (store) {
              store.set('sessions', kept)
              log.info(`[StoreService] Cleaned ${removed} old sessions, kept ${kept.length}`)
            }
          }
          resolve()
        } catch (err) {
          log.error('[StoreService] Cleanup failed:', err)
          resolve()
        }
      })
    })
  }

  // ── Migration ────────────────────────────────────────────────

  /** Migrate from old single-file config.json to new domain-split layout */
  migrateFromLegacy(): boolean {
    try {
      const legacyPath = path.join(this.userDataPath, 'config.json')
      const settingsPath = path.join(this.userDataPath, 'settings.json')

      // Only migrate if old file exists and new files don't
      if (!fs.existsSync(legacyPath)) return false
      if (fs.existsSync(settingsPath)) return false

      log.info('[StoreService] Detected legacy config.json, starting migration...')

      // Read old data
      const old = new Store({ name: 'config' })
      const oldData: Record<string, unknown> = {}
      // electron-store v8 specific: access internal data
      try {
        // Try reading known keys from the old store
        const keys = ['settings', 'summary', 'history.sessions', 'session.snapshot']
        for (const key of keys) {
          const val = old.get(key)
          if (val !== undefined) oldData[key] = val
        }
      } catch (err) {
        log.error('[StoreService] Failed to read legacy data:', err)
        return false
      }

      // Migrate to new stores
      if (oldData['settings']) {
        const settings = oldData['settings'] as Record<string, any>
        // Extract API keys for safeStorage
        const whisperKey = settings?.ai?.whisper?.apiKey
        const translatorKey = settings?.ai?.translator?.apiKey
        if (whisperKey) {
          // Strip keys from settings before storing
          settings.ai.whisper.apiKey = ''
        }
        if (translatorKey) {
          settings.ai.translator.apiKey = ''
        }
        this.stores.get('settings')?.set('config', settings)
        // Store secrets separately — these are async but we fire-and-forget here
        // They'll be queued
        if (whisperKey) this.setSecret('whisperApiKey', whisperKey)
        if (translatorKey) this.setSecret('translatorApiKey', translatorKey)
      }
      if (oldData['summary']) {
        this.stores.get('session')?.set('summary', oldData['summary'])
      }
      if (oldData['history.sessions']) {
        this.stores.get('history')?.set('sessions', oldData['history.sessions'])
      }
      if (oldData['session.snapshot']) {
        this.stores.get('session')?.set('snapshot', oldData['session.snapshot'])
      }

      // Backup legacy file
      const bakPath = legacyPath + `.migrated.${Date.now()}.bak`
      fs.renameSync(legacyPath, bakPath)
      log.info('[StoreService] Migration complete. Legacy file backed up as', bakPath)
      return true
    } catch (err) {
      log.error('[StoreService] Migration failed:', err)
      return false
    }
  }

  // ── Write queue internals ────────────────────────────────────

  private enqueue(op: QueueOp): void {
    this._writeQueue = this._writeQueue.then(op).catch((err) => {
      log.error('[StoreService] Write queue error:', err)
    })
  }
}

// Singleton
export const storeService = new StoreService()
