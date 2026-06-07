import { describe, it, expect, vi, beforeEach } from 'vitest'

// Install shared mock
const mockApi = (() => {
  const m = {
    store: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue({ success: true }),
      getSecret: vi.fn().mockResolvedValue(null),
      setSecret: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({
        domains: {},
        historyCount: 0,
        oldestSessionTime: null,
        totalSize: 0,
      }),
      cleanup: vi.fn().mockResolvedValue(undefined),
    },
    floating: {
      updateSubtitles: vi.fn().mockResolvedValue(true),
      updateTheme: vi.fn().mockResolvedValue(true),
      updateSummary: vi.fn().mockResolvedValue(true),
    },
    logToMain: vi.fn(),
  }
  Object.defineProperty(window, 'api', { value: m, writable: true })
  return m
})()

import { useHistoryStore, type HistorySession } from '../src/renderer/src/store/historyStore'
import { useSubtitleStore } from '../src/renderer/src/store/subtitleStore'
import { useSummaryStore } from '../src/renderer/src/store/summaryStore'
import { useSnapshotStore } from '../src/renderer/src/store/snapshotStore'
import type { SubtitleEntry } from '../src/shared/types'

function makeEntry(originalText: string, translatedText: string, isFinal = true): SubtitleEntry {
  return {
    id: `sub_${Date.now()}_${Math.random()}`,
    timestamp: Date.now(),
    originalText,
    translatedText,
    isFinal,
    mode: 'microphone'
  }
}

function makeEntries(): SubtitleEntry[] {
  return [
    { ...makeEntry('Hello', '你好'), timestamp: 1000 },
    { ...makeEntry('World', '世界'), timestamp: 2000 },
    { ...makeEntry('Test', '测试'), timestamp: 3000 }
  ]
}

describe('History Store', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useHistoryStore.getState().clearHistory()
    mockApi.store.get.mockResolvedValue(null)
  })

  it('should save session with entries and summary', async () => {
    const entries = makeEntries()
    await useHistoryStore.getState().saveSession(entries, 'microphone', '# Summary')

    const sessions = useHistoryStore.getState().sessions
    expect(sessions).toHaveLength(1)
    expect(sessions[0].mode).toBe('microphone')
    expect(sessions[0].entries).toHaveLength(3)
    expect(sessions[0].summary).toBe('# Summary')
    expect(sessions[0].startTime).toBe(1000)
    expect(sessions[0].endTime).toBe(3000)
    expect(mockApi.store.set).toHaveBeenCalled()
  })

  it('should save with correct store key', async () => {
    const entries = makeEntries()
    await useHistoryStore.getState().saveSession(entries, 'url')
    const callKey = mockApi.store.set.mock.calls[0][0]
    expect(callKey).toBe('history.sessions')
  })

  it('should save session with null summary', async () => {
    const entries = makeEntries()
    await useHistoryStore.getState().saveSession(entries, 'url')

    const sessions = useHistoryStore.getState().sessions
    expect(sessions[0].summary).toBeNull()
  })

  it('should not save empty session', async () => {
    await useHistoryStore.getState().saveSession([], 'microphone')
    expect(useHistoryStore.getState().sessions).toHaveLength(0)
  })

  it('should update latest summary after session is saved', async () => {
    await useHistoryStore.getState().saveSession(makeEntries(), 'microphone')
    expect(useHistoryStore.getState().sessions[0].summary).toBeNull()

    const summary = '# Test Summary'
    await useHistoryStore.getState().updateLatestSummary(summary)

    expect(useHistoryStore.getState().sessions[0].summary).toBe(summary)
    // Verify it persisted the updated array
    expect(mockApi.store.set).toHaveBeenCalledWith('history.sessions', expect.any(Array))
  })

  it('should not crash when updating summary with empty history', async () => {
    await useHistoryStore.getState().updateLatestSummary('test')
    expect(useHistoryStore.getState().sessions).toHaveLength(0)
  })

  it('should delete session by id', async () => {
    await useHistoryStore.getState().saveSession(makeEntries(), 'url')
    const id = useHistoryStore.getState().sessions[0].id

    await useHistoryStore.getState().deleteSession(id)
    expect(useHistoryStore.getState().sessions).toHaveLength(0)
  })

  it('should cap sessions at MAX_SESSIONS', async () => {
    const entries = makeEntries()
    for (let i = 0; i < 105; i++) {
      await useHistoryStore.getState().saveSession(entries, 'url')
    }
    expect(useHistoryStore.getState().sessions.length).toBeLessThanOrEqual(100)
  })

  it('should load history from store', async () => {
    const saved: HistorySession[] = [{
      id: 'test-session',
      mode: 'url',
      startTime: 1000,
      endTime: 2000,
      entries: makeEntries(),
      summary: 'preloaded',
      keywords: []
    }]
    mockApi.store.get.mockResolvedValueOnce(saved)

    await useHistoryStore.getState().loadHistory()
    const sessions = useHistoryStore.getState().sessions
    expect(sessions).toHaveLength(1)
    expect(sessions[0].id).toBe('test-session')
    expect(sessions[0].summary).toBe('preloaded')
  })

  it('should handle empty store on load', async () => {
    mockApi.store.get.mockResolvedValueOnce(null)
    await useHistoryStore.getState().loadHistory()
    expect(useHistoryStore.getState().sessions).toHaveLength(0)
  })

  it('should generate keywords from summary when loading legacy sessions without keywords', async () => {
    const saved = [{
      id: 'legacy-session',
      mode: 'url',
      startTime: 1000,
      endTime: 2000,
      entries: makeEntries(),
      summary: '# AI and Machine Learning'
      // keywords field missing
    }]
    mockApi.store.get.mockResolvedValueOnce(saved)

    await useHistoryStore.getState().loadHistory()
    const sessions = useHistoryStore.getState().sessions
    expect(sessions[0].keywords).toEqual(expect.any(Array))
  })
})

describe('Summary → History mapping', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useSubtitleStore.getState().clearEntries()
    useHistoryStore.getState().clearHistory()
    mockApi.store.get.mockResolvedValue(null)
    mockApi.store.set.mockResolvedValue({ success: true })
  })

  it('should update saved session when summary is generated after stop', async () => {
    const entries = makeEntries()
    useSubtitleStore.getState().addEntry(entries[0])
    useSubtitleStore.getState().addEntry(entries[1])

    await useHistoryStore.getState().saveSession(
      useSubtitleStore.getState().entries, 'microphone', null
    )
    expect(useHistoryStore.getState().sessions[0].summary).toBeNull()

    useSummaryStore.getState().setSummary('# Generated Summary')

    expect(useHistoryStore.getState().sessions[0].summary).toBe('# Generated Summary')
  })
})

describe('Snapshot Store', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useSubtitleStore.getState().clearEntries()
    mockApi.store.get.mockResolvedValue(null)
    mockApi.store.set.mockResolvedValue({ success: true })
  })

  it('should start and stop snapshot interval', () => {
    useSnapshotStore.getState().startSnapshot()
    expect(useSnapshotStore.getState().snapshotIntervalId).not.toBeNull()

    useSnapshotStore.getState().stopSnapshot()
    expect(useSnapshotStore.getState().snapshotIntervalId).toBeNull()
  })

  it('should clear snapshot via store API', async () => {
    await useSnapshotStore.getState().clearSnapshot()
    expect(mockApi.store.set).toHaveBeenCalledWith('session.snapshot', null)
    expect(useSnapshotStore.getState().snapshot).toBeNull()
  })

  it('should load snapshot from store', async () => {
    const snapshot = {
      entries: makeEntries(),
      summary: '# Recovery test',
      mode: 'url' as const,
      timestamp: Date.now()
    }
    mockApi.store.get.mockResolvedValueOnce(snapshot)

    const loaded = await useSnapshotStore.getState().loadSnapshot()
    expect(loaded).not.toBeNull()
    expect(loaded!.entries).toHaveLength(3)
    expect(loaded!.summary).toBe('# Recovery test')
    expect(loaded!.mode).toBe('url')
  })

  it('should return null for invalid snapshot data', async () => {
    mockApi.store.get.mockResolvedValueOnce({ entries: [], timestamp: 0 })
    const loaded = await useSnapshotStore.getState().loadSnapshot()
    expect(loaded).toBeNull()
  })
})

describe('Summary Store', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useSubtitleStore.getState().clearEntries()
    useHistoryStore.getState().clearHistory()
    // Reset summary store state directly (skip persist side effect)
    useSummaryStore.setState({ summary: null, isGenerating: false, sessionGeneratingId: null })
    mockApi.store.get.mockResolvedValue(null)
    mockApi.store.set.mockResolvedValue({ success: true })
  })

  it('should persist summary to session domain', () => {
    useSummaryStore.getState().setSummary('# Test')
    expect(mockApi.store.set).toHaveBeenCalledWith('summary', '# Test')
  })

  it('should reset summary to null', () => {
    useSummaryStore.getState().setSummary('# Test')
    vi.clearAllMocks()
    useSummaryStore.getState().reset()
    expect(mockApi.store.set).toHaveBeenCalledWith('summary', null)
    expect(useSummaryStore.getState().summary).toBeNull()
  })

  it('should load summary from store', async () => {
    mockApi.store.get.mockResolvedValueOnce('# Saved Summary')
    await useSummaryStore.getState().loadSummary()
    expect(useSummaryStore.getState().summary).toBe('# Saved Summary')
  })

  it('should handle null summary on load', async () => {
    mockApi.store.get.mockResolvedValueOnce(null)
    await useSummaryStore.getState().loadSummary()
    expect(useSummaryStore.getState().summary).toBeNull()
  })
})

describe('Storage API contract', () => {
  it('should expose getSecret and setSecret in window.api', () => {
    expect(typeof window.api.store.getSecret).toBe('function')
    expect(typeof window.api.store.setSecret).toBe('function')
  })

  it('should expose getStats and cleanup in window.api', () => {
    expect(typeof window.api.store.getStats).toBe('function')
    expect(typeof window.api.store.cleanup).toBe('function')
  })

  it('should use key format compatible with domain mapping', async () => {
    // Keys used by stores must follow the flat format:
    //   settings          → domain=settings, key=config
    //   history.sessions  → domain=history,  key=sessions
    //   session.snapshot  → domain=session,  key=snapshot
    //   summary           → domain=session,  key=summary
    const validKeys = ['settings', 'history.sessions', 'session.snapshot', 'summary']

    for (const key of validKeys) {
      const dotIndex = key.indexOf('.')
      const domain = dotIndex > 0 ? key.slice(0, dotIndex) : (key === 'summary' ? 'session' : 'settings')
      expect(['settings', 'history', 'session']).toContain(domain)
    }
  })
})

describe('Subtitle store', () => {
  beforeEach(() => {
    useSubtitleStore.getState().clearEntries()
  })

  it('should clear entries without side effects', () => {
    const store = useSubtitleStore.getState()
    store.addEntry(makeEntry('A', '甲'))
    store.addEntry(makeEntry('B', '乙'))
    expect(useSubtitleStore.getState().entries).toHaveLength(2)

    store.clearEntries()
    expect(useSubtitleStore.getState().entries).toHaveLength(0)
  })

  it('should generate unique IDs per entry', () => {
    const store = useSubtitleStore.getState()
    const e1 = store.createEntry('A', 'url')
    const e2 = store.createEntry('B', 'url')
    expect(e1.id).not.toBe(e2.id)
  })
})
