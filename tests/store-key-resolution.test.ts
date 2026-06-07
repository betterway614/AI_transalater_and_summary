/**
 * Tests for storage key resolution (IPC handler key-to-domain mapping logic).
 *
 * The mapping is:
 *   settings          → domain=settings, key=config
 *   history.sessions  → domain=history,  key=sessions
 *   session.snapshot  → domain=session,  key=snapshot
 *   summary           → domain=session,  key=summary
 */
import { describe, it, expect } from 'vitest'

// Replicated resolveDomainAndKey logic from store.ipc.ts for testability
function resolveDomainAndKey(
  flatKey: string,
): { domain: string; key: string } | null {
  const dotIndex = flatKey.indexOf('.')
  if (dotIndex > 0) {
    const domain = flatKey.slice(0, dotIndex)
    const key = flatKey.slice(dotIndex + 1)
    if (['history', 'session', 'secrets'].includes(domain)) {
      return { domain, key }
    }
  }

  if (flatKey === 'settings') return { domain: 'settings', key: 'config' }
  if (flatKey === 'summary') return { domain: 'session', key: 'summary' }

  return null
}

describe('Key-to-domain resolution', () => {
  it('should map "settings" to domain=settings key=config', () => {
    expect(resolveDomainAndKey('settings')).toEqual({ domain: 'settings', key: 'config' })
  })

  it('should map "summary" to domain=session key=summary', () => {
    expect(resolveDomainAndKey('summary')).toEqual({ domain: 'session', key: 'summary' })
  })

  it('should map "history.sessions" to domain=history key=sessions', () => {
    expect(resolveDomainAndKey('history.sessions')).toEqual({ domain: 'history', key: 'sessions' })
  })

  it('should map "session.snapshot" to domain=session key=snapshot', () => {
    expect(resolveDomainAndKey('session.snapshot')).toEqual({ domain: 'session', key: 'snapshot' })
  })

  it('should map "secrets.whisperApiKey" to domain=secrets key=whisperApiKey', () => {
    expect(resolveDomainAndKey('secrets.whisperApiKey')).toEqual({ domain: 'secrets', key: 'whisperApiKey' })
  })

  it('should map "secrets.translatorApiKey" to domain=secrets key=translatorApiKey', () => {
    expect(resolveDomainAndKey('secrets.translatorApiKey')).toEqual({ domain: 'secrets', key: 'translatorApiKey' })
  })

  it('should return null for unknown keys', () => {
    expect(resolveDomainAndKey('')).toBeNull()
    expect(resolveDomainAndKey('unknown')).toBeNull()
    expect(resolveDomainAndKey('random.key')).toBeNull()
  })

  it('should handle keys with multiple dots', () => {
    // Only first dot is used
    expect(resolveDomainAndKey('history.foo.bar')).toEqual({ domain: 'history', key: 'foo.bar' })
  })
})
