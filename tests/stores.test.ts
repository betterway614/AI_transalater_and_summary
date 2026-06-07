import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock window.api for store tests
const mockApi = {
  store: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue({ success: true })
  },
  floating: {
    updateSubtitles: vi.fn().mockResolvedValue(true),
    updateTheme: vi.fn().mockResolvedValue(true),
    updateSummary: vi.fn().mockResolvedValue(true)
  },
  logToMain: vi.fn()
}

Object.defineProperty(window, 'api', { value: mockApi, writable: true })

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
    // Save without summary (simulates stopping translation)
    await useHistoryStore.getState().saveSession(makeEntries(), 'microphone')
    expect(useHistoryStore.getState().sessions[0].summary).toBeNull()

    // Generate summary (simulates clicking AI Summary button)
    const summary = '# Test Summary'
    await useHistoryStore.getState().updateLatestSummary(summary)

    expect(useHistoryStore.getState().sessions[0].summary).toBe(summary)
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
      summary: 'preloaded'
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
    // Simulate: stop translation → session saved with summary=null
    const entries = makeEntries()
    useSubtitleStore.getState().addEntry(entries[0])
    useSubtitleStore.getState().addEntry(entries[1])

    await useHistoryStore.getState().saveSession(
      useSubtitleStore.getState().entries, 'microphone', null
    )
    expect(useHistoryStore.getState().sessions[0].summary).toBeNull()

    // Simulate: user clicks "AI Summary" → summary generated
    useSummaryStore.getState().setSummary('# Generated Summary')

    // Verify: session was updated
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

  it('should clear snapshot', async () => {
    await useSnapshotStore.getState().clearSnapshot()
    expect(mockApi.store.set).toHaveBeenCalledWith('session.snapshot', null)
    expect(useSnapshotStore.getState().snapshot).toBeNull()
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
