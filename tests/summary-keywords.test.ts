import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock window.api for store tests
const mockApi = {
  ai: { transcribe: vi.fn(), chatCompletion: vi.fn(), testConnection: vi.fn() },
  store: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue({ success: true })
  },
  floating: {
    updateSubtitles: vi.fn().mockResolvedValue(true),
    updateTheme: vi.fn().mockResolvedValue(true),
    updateSummary: vi.fn().mockResolvedValue(true),
    show: vi.fn().mockResolvedValue(true),
    hide: vi.fn().mockResolvedValue(true)
  },
  logToMain: vi.fn()
}

Object.defineProperty(window, 'api', { value: mockApi, writable: true })

import { extractKeywords } from '../src/renderer/src/utils/markdown-exporter'
import { useHistoryStore } from '../src/renderer/src/store/historyStore'
import { useSubtitleStore } from '../src/renderer/src/store/subtitleStore'
import { useSummaryStore } from '../src/renderer/src/store/summaryStore'
import { useSettingsStore } from '../src/renderer/src/store/settingsStore'
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

function makeEntries(count = 3): SubtitleEntry[] {
  return [
    { ...makeEntry('Hello world', '你好世界'), timestamp: 1000 },
    { ...makeEntry('How are you', '你好吗'), timestamp: 2000 },
    { ...makeEntry('Thank you', '谢谢'), timestamp: 3000 },
  ].slice(0, count)
}

function setValidApiKey() {
  useSettingsStore.getState().updateAI({
    translator: {
      provider: 'deepseek',
      apiKey: 'test-api-key',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com'
    }
  })
}

const SAMPLE_SUMMARY = `# 会议纪要：AI 项目启动会

## 项目背景与目标
- 提升翻译效率
- 支持多语种

## 技术方案选型
- 基于 DeepSeek API
- 使用 Electron 框架

## 下一步计划
- 完成原型开发
- 进行用户测试

## 风险评估
- API 成本控制
- 数据隐私合规
`

describe('extractKeywords', () => {
  it('should extract ## level headings as keywords from markdown', () => {
    const keywords = extractKeywords(SAMPLE_SUMMARY)
    expect(keywords.length).toBeGreaterThanOrEqual(3)
    expect(keywords).toContain('项目背景与目标')
    expect(keywords).toContain('技术方案选型')
    expect(keywords).toContain('下一步计划')
  })

  it('should cap keywords at 5 by default', () => {
    const md = Array.from({ length: 8 }, (_, i) => `## Topic ${i + 1}\n\n- detail`).join('\n\n')
    const keywords = extractKeywords(md)
    expect(keywords.length).toBe(5)
  })

  it('should strip markdown formatting from headings', () => {
    const md = '## **重要**议题：`Code Review`\n\ncontent'
    const keywords = extractKeywords(md)
    expect(keywords[0]).toBe('重要议题：Code Review')
  })

  it('should strip numbered list prefixes', () => {
    const md = '## 1. 项目启动\n\ncontent\n\n## 2、需求分析\n\ncontent'
    const keywords = extractKeywords(md)
    expect(keywords[0]).toBe('项目启动')
    expect(keywords[1]).toBe('需求分析')
  })

  it('should strip bullet markers from headings', () => {
    const md = '## - 第一步\n\ncontent\n\n## * 第二步\n\ncontent'
    const keywords = extractKeywords(md)
    expect(keywords[0]).toBe('第一步')
    expect(keywords[1]).toBe('第二步')
  })

  it('should filter out headings longer than 20 chars', () => {
    const md = '## This is a very long heading that exceeds twenty characters\n\n## Short\n\ncontent'
    const keywords = extractKeywords(md)
    expect(keywords).toHaveLength(1)
    expect(keywords[0]).toBe('Short')
  })

  it('should return empty array for markdown without ## headings', () => {
    const md = '# Only H1\n\n### Only H3\n\nJust some text'
    const keywords = extractKeywords(md)
    expect(keywords).toHaveLength(0)
  })

  it('should return empty array for non-markdown text', () => {
    const keywords = extractKeywords('plain text without any headings')
    expect(keywords).toHaveLength(0)
  })

  it('should accept custom maxCount', () => {
    const md = '## A\n\n## B\n\n## C\n\n## D\n\n## E\n\n## F'
    const keywords = extractKeywords(md, 3)
    expect(keywords).toHaveLength(3)
    expect(keywords).toEqual(['A', 'B', 'C'])
  })
})

describe('History Store — keywords extraction on save', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useHistoryStore.getState().clearHistory()
    mockApi.store.get.mockResolvedValue(null)
    mockApi.store.set.mockResolvedValue({ success: true })
  })

  it('should extract keywords from summary when saving session', async () => {
    const entries = makeEntries()
    await useHistoryStore.getState().saveSession(entries, 'microphone', SAMPLE_SUMMARY)

    const session = useHistoryStore.getState().sessions[0]
    expect(session.keywords.length).toBeGreaterThanOrEqual(3)
    expect(session.keywords).toContain('项目背景与目标')
  })

  it('should save empty keywords array when summary is null', async () => {
    const entries = makeEntries()
    await useHistoryStore.getState().saveSession(entries, 'url')

    const session = useHistoryStore.getState().sessions[0]
    expect(session.keywords).toEqual([])
  })

  it('should save empty keywords array when summary is empty string', async () => {
    const entries = makeEntries()
    await useHistoryStore.getState().saveSession(entries, 'url', '')

    const session = useHistoryStore.getState().sessions[0]
    expect(session.summary).toBeNull()
    expect(session.keywords).toEqual([])
  })
})

describe('History Store — updateSessionSummary with keywords', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useHistoryStore.getState().clearHistory()
    mockApi.store.get.mockResolvedValue(null)
    mockApi.store.set.mockResolvedValue({ success: true })
  })

  it('should update summary and extract keywords for specific session', async () => {
    await useHistoryStore.getState().saveSession(makeEntries(), 'url')
    const sessionId = useHistoryStore.getState().sessions[0].id

    await useHistoryStore.getState().updateSessionSummary(sessionId, SAMPLE_SUMMARY)

    const updated = useHistoryStore.getState().sessions[0]
    expect(updated.summary).toBe(SAMPLE_SUMMARY)
    expect(updated.keywords.length).toBeGreaterThanOrEqual(3)
    expect(updated.keywords).toContain('项目背景与目标')
  })

  it('should target the correct session when multiple exist', async () => {
    // Save session A
    await useHistoryStore.getState().saveSession(makeEntries(), 'url')
    const sessionAId = useHistoryStore.getState().sessions[0].id

    // Update session A
    await useHistoryStore.getState().updateSessionSummary(sessionAId, SAMPLE_SUMMARY)

    // Save session B (goes to index 0, session A shifts to index 1)
    await useHistoryStore.getState().saveSession(
      [{ ...makeEntry('other', '其他'), timestamp: 5000 }], 'microphone'
    )

    const updated = useHistoryStore.getState().sessions
    expect(updated).toHaveLength(2)
    // Session A (index 1) was updated before session B existed — carries summary
    expect(updated[1].summary).toBe(SAMPLE_SUMMARY)
    expect(updated[1].keywords.length).toBeGreaterThan(0)
    // Session B (index 0) was saved after — still null
    expect(updated[0].summary).toBeNull()
    expect(updated[0].keywords).toEqual([])
  })

  it('should silently return for non-existent session id', async () => {
    await useHistoryStore.getState().saveSession(makeEntries(), 'url')

    await expect(
      useHistoryStore.getState().updateSessionSummary('non-existent-id', SAMPLE_SUMMARY)
    ).resolves.toBeUndefined()

    // Original session kept untouched
    expect(useHistoryStore.getState().sessions[0].summary).toBeNull()
  })

  it('should persist updated summary to store', async () => {
    await useHistoryStore.getState().saveSession(makeEntries(), 'url')
    const sessionId = useHistoryStore.getState().sessions[0].id

    mockApi.store.set.mockClear()
    await useHistoryStore.getState().updateSessionSummary(sessionId, SAMPLE_SUMMARY)

    expect(mockApi.store.set).toHaveBeenCalledWith('history.sessions', expect.any(Array))
    const callArgs = mockApi.store.set.mock.calls[0]
    expect(callArgs[1][0].summary).toBe(SAMPLE_SUMMARY)
    expect(callArgs[1][0].keywords.length).toBeGreaterThan(0)
  })
})

describe('History Store — updateLatestSummary with keywords', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useHistoryStore.getState().clearHistory()
    mockApi.store.get.mockResolvedValue(null)
    mockApi.store.set.mockResolvedValue({ success: true })
  })

  it('should update latest session summary and extract keywords', async () => {
    await useHistoryStore.getState().saveSession(makeEntries(), 'microphone')

    const summary = '# Test\n\n## 议题一\n\ncontent\n\n## 议题二\n\ncontent'
    await useHistoryStore.getState().updateLatestSummary(summary)

    const updated = useHistoryStore.getState().sessions[0]
    expect(updated.summary).toBe(summary)
    expect(updated.keywords).toEqual(['议题一', '议题二'])
  })

  it('should not crash when no sessions exist', async () => {
    await useHistoryStore.getState().updateLatestSummary('test')
    expect(useHistoryStore.getState().sessions).toHaveLength(0)
  })
})

describe('History Store — backward compat on load', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useHistoryStore.getState().clearHistory()
  })

  it('should add keywords field to old sessions without it', async () => {
    const oldSession = {
      id: 'old-session',
      mode: 'url' as const,
      startTime: 1000,
      endTime: 2000,
      entries: makeEntries(),
      summary: SAMPLE_SUMMARY
      // note: no keywords field
    }
    mockApi.store.get.mockResolvedValueOnce([oldSession])

    await useHistoryStore.getState().loadHistory()

    const sessions = useHistoryStore.getState().sessions
    expect(sessions).toHaveLength(1)
    expect(sessions[0].keywords.length).toBeGreaterThanOrEqual(3)
    expect(sessions[0].keywords).toContain('项目背景与目标')
  })

  it('should preserve existing keywords field', async () => {
    const sessionWithKeywords = {
      id: 'with-kw',
      mode: 'url' as const,
      startTime: 1000,
      endTime: 2000,
      entries: makeEntries(),
      summary: SAMPLE_SUMMARY,
      keywords: ['custom1', 'custom2']
    }
    mockApi.store.get.mockResolvedValueOnce([sessionWithKeywords])

    await useHistoryStore.getState().loadHistory()

    const sessions = useHistoryStore.getState().sessions
    expect(sessions[0].keywords).toEqual(['custom1', 'custom2'])
  })

  it('should set empty keywords for old session without summary', async () => {
    const oldSessionNoSummary = {
      id: 'old-no-summary',
      mode: 'microphone' as const,
      startTime: 1000,
      endTime: 2000,
      entries: makeEntries(),
      summary: null
      // no keywords
    }
    mockApi.store.get.mockResolvedValueOnce([oldSessionNoSummary])

    await useHistoryStore.getState().loadHistory()

    const sessions = useHistoryStore.getState().sessions
    expect(sessions[0].keywords).toEqual([])
  })

  it('should handle empty keywords array in old data', async () => {
    const sessionWithEmptyKw = {
      id: 'empty-kw',
      mode: 'url' as const,
      startTime: 1000,
      endTime: 2000,
      entries: makeEntries(),
      summary: SAMPLE_SUMMARY,
      keywords: []
    }
    mockApi.store.get.mockResolvedValueOnce([sessionWithEmptyKw])

    await useHistoryStore.getState().loadHistory()

    const sessions = useHistoryStore.getState().sessions
    expect(sessions[0].keywords).toEqual([])
  })
})

describe('Summary Store — generateSummary with options', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useSubtitleStore.getState().clearEntries()
    useHistoryStore.getState().clearHistory()
    useSummaryStore.getState().reset()
    setValidApiKey()
    mockApi.store.get.mockResolvedValue(null)
    mockApi.store.set.mockResolvedValue({ success: true })
    mockApi.ai.chatCompletion.mockResolvedValue({ text: SAMPLE_SUMMARY })
  })

  it('should generate summary from live subtitle entries (backward compat)', async () => {
    useSubtitleStore.getState().addEntry(makeEntry('Hello', '你好'))
    useSubtitleStore.getState().addEntry(makeEntry('World', '世界'))

    await useSummaryStore.getState().generateSummary()

    expect(useSummaryStore.getState().summary).toBe(SAMPLE_SUMMARY)
    expect(useSummaryStore.getState().isGenerating).toBe(false)
    expect(mockApi.ai.chatCompletion).toHaveBeenCalled()
  })

  it('should generate summary for specific history session', async () => {
    // Save a history session first
    await useHistoryStore.getState().saveSession(makeEntries(), 'url')
    const sessionId = useHistoryStore.getState().sessions[0].id

    // Now generate summary for that session via history entries
    await useSummaryStore.getState().generateSummary({
      entries: useHistoryStore.getState().sessions[0].entries,
      sessionId
    })

    // Verify the history session was updated (not live summary)
    const historySession = useHistoryStore.getState().sessions[0]
    expect(historySession.summary).toBe(SAMPLE_SUMMARY)
    expect(historySession.keywords.length).toBeGreaterThanOrEqual(3)

    // Live summary should NOT be set (since it came from history)
    expect(useSummaryStore.getState().summary).toBeNull()
  })

  it('should record sessionGeneratingId during generation', async () => {
    await useHistoryStore.getState().saveSession(makeEntries(), 'url')
    const sessionId = useHistoryStore.getState().sessions[0].id

    await useSummaryStore.getState().generateSummary({
      entries: useHistoryStore.getState().sessions[0].entries,
      sessionId
    })

    // After generation completes, both flags should be clear
    expect(useSummaryStore.getState().sessionGeneratingId).toBeNull()
    expect(useSummaryStore.getState().isGenerating).toBe(false)
    expect(mockApi.ai.chatCompletion).toHaveBeenCalled()
  })

  it('should not generate when no confirmed entries', async () => {
    useSubtitleStore.getState().addEntry({
      ...makeEntry('pending', '待翻译'),
      isFinal: false
    })

    await useSummaryStore.getState().generateSummary()

    expect(useSummaryStore.getState().summary).toBeNull()
    expect(mockApi.ai.chatCompletion).not.toHaveBeenCalled()
  })
})

describe('Integration: full save → summarize → keyword cycle', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useSubtitleStore.getState().clearEntries()
    useHistoryStore.getState().clearHistory()
    useSummaryStore.getState().reset()
    setValidApiKey()
    mockApi.store.get.mockResolvedValue(null)
    mockApi.store.set.mockResolvedValue({ success: true })
    mockApi.ai.chatCompletion.mockResolvedValue({ text: SAMPLE_SUMMARY })
  })

  it('should complete: translate → save → generate summary for history → show keywords', async () => {
    // Step 1: Simulate translation (add entries)
    useSubtitleStore.getState().addEntry({ ...makeEntry('Hello', '你好'), timestamp: 1000 })
    useSubtitleStore.getState().addEntry({ ...makeEntry('World', '世界'), timestamp: 2000 })

    // Step 2: Stop → session saved (no summary yet)
    // Always re-read entries after mutations: getState() returns a snapshot
    const entries = useSubtitleStore.getState().entries
    await useHistoryStore.getState().saveSession(entries, 'microphone')
    const sessionsAfterSave = useHistoryStore.getState().sessions
    expect(sessionsAfterSave).toHaveLength(1)
    const sessionId = sessionsAfterSave[0].id
    expect(sessionsAfterSave[0].summary).toBeNull()
    expect(sessionsAfterSave[0].keywords).toEqual([])

    // Step 3: User visits history page, clicks "生成总结"
    await useSummaryStore.getState().generateSummary({
      entries: sessionsAfterSave[0].entries,
      sessionId
    })

    // Step 4: Session now has summary and keywords
    const updated = useHistoryStore.getState().sessions[0]
    expect(updated.summary).toBe(SAMPLE_SUMMARY)
    expect(updated.keywords.length).toBeGreaterThanOrEqual(3)
    expect(updated.keywords).toContain('项目背景与目标')
    expect(updated.keywords).toContain('技术方案选型')
    expect(updated.keywords).toContain('下一步计划')

    // Step 5: Live summary not affected
    expect(useSummaryStore.getState().summary).toBeNull()
  })

  it('should complete: translate → stop → live generate summary → keywords in history', async () => {
    // Step 1: Simulate translation
    useSubtitleStore.getState().addEntry({ ...makeEntry('Hello', '你好'), timestamp: 1000 })

    // Step 2: Stop → session saved (no summary)
    // Always re-read entries after mutations: getState() returns a snapshot
    const entries = useSubtitleStore.getState().entries
    await useHistoryStore.getState().saveSession(entries, 'microphone')
    expect(useHistoryStore.getState().sessions).toHaveLength(1)

    // Step 3: User clicks AI button on live SummaryPanel
    await useSummaryStore.getState().generateSummary()

    // Step 4: Both live summary and history updated
    expect(useSummaryStore.getState().summary).toBe(SAMPLE_SUMMARY)
    const session = useHistoryStore.getState().sessions[0]
    expect(session.summary).toBe(SAMPLE_SUMMARY)
    expect(session.keywords.length).toBeGreaterThanOrEqual(3)
  })
})

describe('Mode switch effect — HomePage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useSubtitleStore.getState().clearEntries()
    useHistoryStore.getState().clearHistory()
    useSummaryStore.getState().reset()
    mockApi.store.set.mockResolvedValue({ success: true })
  })

  it('should clear entries and reset summary when mode switches (pure logic)', () => {
    // Simulate: previous session left entries
    useSubtitleStore.getState().addEntry(makeEntry('old', '旧'))
    useSummaryStore.getState().setSummary('# old summary')

    expect(useSubtitleStore.getState().entries).toHaveLength(1)
    expect(useSummaryStore.getState().summary).toBe('# old summary')

    // Simulate mode switch cleanup (like the useEffect in HomePage)
    useSubtitleStore.getState().clearEntries()
    useSummaryStore.getState().reset()

    expect(useSubtitleStore.getState().entries).toHaveLength(0)
    expect(useSummaryStore.getState().summary).toBeNull()
    expect(useSummaryStore.getState().isGenerating).toBe(false)
  })
})
