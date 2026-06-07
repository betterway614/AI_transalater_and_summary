import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock window.api for store/service tests
const mockApi = {
  ai: { transcribe: vi.fn(), chatCompletion: vi.fn(), testConnection: vi.fn() },
  store: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue({ success: true })
  },
  ytdlp: {
    onProgress: vi.fn().mockReturnValue(() => {}),
    extractAudio: vi.fn(),
    getInfo: vi.fn(),
    cancel: vi.fn(),
    setCookies: vi.fn()
  },
  floating: {
    show: vi.fn().mockResolvedValue(true),
    hide: vi.fn().mockResolvedValue(true),
    updateSubtitles: vi.fn().mockResolvedValue(true),
    updateTheme: vi.fn().mockResolvedValue(true),
    updateSummary: vi.fn().mockResolvedValue(true),
    updateSubtitleSettings: vi.fn().mockResolvedValue(true),
    setExpanded: vi.fn(),
    onSubtitlesUpdate: vi.fn().mockReturnValue(() => {}),
    onThemeUpdate: vi.fn().mockReturnValue(() => {}),
    onSummaryUpdate: vi.fn().mockReturnValue(() => {}),
    onSubtitleSettingsUpdate: vi.fn().mockReturnValue(() => {}),
    onDisplayModeChange: vi.fn().mockReturnValue(() => {})
  },
  auth: {
    login: vi.fn(),
    getLoggedIn: vi.fn().mockResolvedValue([]),
    getCookies: vi.fn().mockResolvedValue(null),
    logout: vi.fn(),
    detectPlatform: vi.fn().mockResolvedValue(null),
    getPlatforms: vi.fn().mockResolvedValue([])
  },
  systemAudio: {
    start: vi.fn().mockResolvedValue({ success: true }),
    stop: vi.fn().mockResolvedValue(undefined),
    getDevices: vi.fn().mockResolvedValue(['default']),
    getScreenSource: vi.fn().mockResolvedValue('screen:0:0'),
    onData: vi.fn().mockReturnValue(() => {}),
    onError: vi.fn().mockReturnValue(() => {})
  },
  exportMarkdown: vi.fn().mockResolvedValue('/tmp/test.md'),
  logToMain: vi.fn(),
  window: {
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn()
  }
}

Object.defineProperty(window, 'api', { value: mockApi, writable: true })

import { useSubtitleStore } from '../src/renderer/src/store/subtitleStore'
import { useAppStore } from '../src/renderer/src/store/appStore'
import { useHistoryStore } from '../src/renderer/src/store/historyStore'
import { useSummaryStore } from '../src/renderer/src/store/summaryStore'
import { useSettingsStore } from '../src/renderer/src/store/settingsStore'
import { WhisperService } from '../src/renderer/src/services/whisper.service'
import { DeepSeekService } from '../src/renderer/src/services/deepseek.service'
import { detectVoiceActivity, pcmToWav, computeTextOverlap, splitSentences } from '../src/renderer/src/services/audio-processor'
import { DEFAULT_SETTINGS } from '../src/shared/types'

describe('Smoke: Full Pipeline — Voice → Ordered Subtitles → Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSubtitleStore.getState().clearEntries()
    useAppStore.getState().reset()
    useHistoryStore.getState().clearHistory()
    useSummaryStore.getState().reset()
    // Ensure API key is set
    useSettingsStore.getState().updateAI({
      whisper: {
        provider: 'openai',
        apiKey: 'smoke-test-key',
        model: 'whisper-1',
        baseUrl: 'https://api.openai.com'
      },
      translator: {
        provider: 'deepseek',
        apiKey: 'smoke-test-key',
        model: 'deepseek-chat',
        baseUrl: 'https://api.deepseek.com'
      }
    })
    mockApi.store.get.mockResolvedValue(null)
    mockApi.store.set.mockResolvedValue({ success: true })
  })

  it('should complete: create voice audio → VAD → WAV → ASR → dedup → ordered add → translate → finalize', async () => {
    // Step 1: Create voice audio (440Hz sine = detectable)
    const sampleRate = 16000
    const samples = new Float32Array(sampleRate)
    for (let i = 0; i < samples.length; i++) {
      samples[i] = 0.3 * Math.sin((2 * Math.PI * 440 * i) / sampleRate)
    }

    // Step 2: VAD detects voice
    expect(detectVoiceActivity(samples, -40)).toBe(true)

    // Step 3: PCM → WAV
    const wav = pcmToWav(samples, sampleRate)
    const wavBlob = new Blob([wav], { type: 'audio/wav' })
    expect(wavBlob.size).toBeGreaterThan(44)

    // Step 4: ASR via Whisper
    mockApi.ai.transcribe.mockResolvedValueOnce({ text: 'Hello world. This is a test.' })
    const whisper = new WhisperService({ apiKey: 'smoke-test-key' })
    const text = await whisper.transcribe(wavBlob)
    expect(text).toBe('Hello world. This is a test.')

    // Step 5: Dedup — first text should not be duplicate
    const isDup = (t: string) => {
      const recent = useSubtitleStore.getState().entries.slice(-3)
      return recent.some((e) => computeTextOverlap(t, e.originalText) >= 0.6)
    }
    expect(isDup(text)).toBe(false)

    // Step 6: Split into sentences, create ordered entries
    const sentences = splitSentences(text)
    expect(sentences).toHaveLength(2) // "Hello world." + "This is a test."

    const store = useSubtitleStore.getState()
    const entry1 = store.createEntry(sentences[0], 'microphone') // _order=1
    const entry2 = store.createEntry(sentences[1], 'microphone') // _order=2
    store.addEntry(entry1)
    store.addEntry(entry2)

    // Step 7: Verify entries are ordered
    let entries = useSubtitleStore.getState().entries
    expect(entries).toHaveLength(2)
    expect(entries[0].originalText).toBe('Hello world.')
    expect(entries[1].originalText).toBe('This is a test.')
    expect((entries[0] as any)._order).toBeLessThan((entries[1] as any)._order)

    // Step 8: Translate entries
    mockApi.ai.chatCompletion.mockResolvedValueOnce({ text: '你好世界。' })
    const deepseek = new DeepSeekService({ apiKey: 'smoke-test-key' })
    let trans1 = ''
    for await (const chunk of deepseek.streamingTranslate(entries[0].originalText)) {
      trans1 = chunk.text
    }
    store.updateEntry(entries[0].id, trans1)
    store.markFinal(entries[0].id, trans1)

    mockApi.ai.chatCompletion.mockResolvedValueOnce({ text: '这是一个测试。' })
    let trans2 = ''
    for await (const chunk of deepseek.streamingTranslate(entries[1].originalText)) {
      trans2 = chunk.text
    }
    store.updateEntry(entries[1].id, trans2)
    store.markFinal(entries[1].id, trans2)

    // Step 9: Verify final state
    entries = useSubtitleStore.getState().entries
    expect(entries[0].originalText).toBe('Hello world.')
    expect(entries[0].translatedText).toBe('你好世界。')
    expect(entries[0].isFinal).toBe(true)
    expect(entries[1].originalText).toBe('This is a test.')
    expect(entries[1].translatedText).toBe('这是一个测试。')
    expect(entries[1].isFinal).toBe(true)
    // Order still maintained after all updates
    expect((entries[0] as any)._order).toBeLessThan((entries[1] as any)._order)
  })

  it('should handle dedup correctly: second overlapping text should be detected', async () => {
    const store = useSubtitleStore.getState()

    // Add first entry
    const entry1 = store.createEntry('Hello everyone, welcome to the show', 'microphone')
    store.addEntry(entry1)
    store.markFinal(entry1.id, '大家好')

    // Second text heavily overlaps with first
    const text2 = 'welcome to the show today we have'

    const isDup = computeTextOverlap(text2, entry1.originalText) >= 0.6
    expect(isDup).toBe(true)
  })

  it('should persist session with ordered entries after translation completes', async () => {
    const store = useSubtitleStore.getState()

    const e1 = store.createEntry('Sentence A', 'url')
    const e2 = store.createEntry('Sentence B', 'url')
    store.addEntry(e1)
    store.addEntry(e2)
    store.updateEntry(e1.id, '句子A')
    store.markFinal(e1.id, '句子A')
    store.updateEntry(e2.id, '句子B')
    store.markFinal(e2.id, '句子B')

    // Persist to history
    await useHistoryStore.getState().saveSession(
      useSubtitleStore.getState().entries,
      'url',
      '# Test Summary'
    )

    const sessions = useHistoryStore.getState().sessions
    expect(sessions).toHaveLength(1)
    expect(sessions[0].mode).toBe('url')
    expect(sessions[0].entries).toHaveLength(2)
    expect(sessions[0].entries[0].originalText).toBe('Sentence A')
    expect(sessions[0].entries[1].originalText).toBe('Sentence B')
    expect(sessions[0].summary).toBe('# Test Summary')

    // Verify persisted to store
    expect(mockApi.store.set).toHaveBeenCalledWith('history.sessions', expect.any(Array))
  })

  it('should clear entries and reset order counter between sessions', () => {
    const store = useSubtitleStore.getState()

    // Session 1
    store.addEntry(store.createEntry('Session1-A', 'url'))
    store.addEntry(store.createEntry('Session1-B', 'url'))
    expect(useSubtitleStore.getState().entries).toHaveLength(2)

    store.clearEntries()
    expect(useSubtitleStore.getState().entries).toHaveLength(0)

    // Session 2: entries should be fresh with new orders
    store.addEntry(store.createEntry('Session2-A', 'url'))
    store.addEntry(store.createEntry('Session2-B', 'url'))
    const entries = useSubtitleStore.getState().entries
    expect(entries).toHaveLength(2)
    expect(entries[0].originalText).toBe('Session2-A')
    expect(entries[1].originalText).toBe('Session2-B')
  })

  it('should pass through all input modes correctly', () => {
    const modes: Array<'url' | 'system-audio' | 'microphone'> = ['url', 'system-audio', 'microphone']
    const store = useSubtitleStore.getState()

    for (const mode of modes) {
      store.clearEntries()
      store.addEntry(store.createEntry(`Test in ${mode} mode`, mode))
      const entry = useSubtitleStore.getState().entries[0]
      expect(entry.mode).toBe(mode)
      expect(entry.originalText).toBe(`Test in ${mode} mode`)
    }
  })

  it('should produce WAV with valid structure after round-trip through pipeline', () => {
    // Create voice
    const samples = new Float32Array(8000)
    for (let i = 0; i < samples.length; i++) {
      samples[i] = 0.3 * Math.sin((2 * Math.PI * 440 * i) / 16000)
    }

    // PCM → WAV
    const wav = pcmToWav(samples, 16000)
    const view = new DataView(wav)

    // Verify all header fields are correct
    const readStr = (offset: number, len: number) => {
      let s = ''
      for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i))
      return s
    }

    // Full WAV header verification
    expect(readStr(0, 4)).toBe('RIFF')
    expect(view.getUint32(4, true)).toBe(wav.byteLength - 8) // file size - 8
    expect(readStr(8, 4)).toBe('WAVE')
    expect(readStr(12, 4)).toBe('fmt ')
    expect(view.getUint32(16, true)).toBe(16) // PCM fmt size
    expect(view.getUint16(20, true)).toBe(1) // PCM format
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint32(24, true)).toBe(16000) // sample rate
    expect(view.getUint32(28, true)).toBe(32000) // byte rate = 16000 * 1 * 2
    expect(view.getUint16(32, true)).toBe(2) // block align
    expect(view.getUint16(34, true)).toBe(16) // bits per sample
    expect(readStr(36, 4)).toBe('data')
    expect(view.getUint32(40, true)).toBe(samples.length * 2) // data size

    // Verify total size: header(44) + data
    expect(wav.byteLength).toBe(44 + samples.length * 2)

    // Verify one sample value is correct (first sample)
    const expectedSample = Math.max(-1, Math.min(1, samples[0]))
    const expectedInt16 = expectedSample < 0 ? expectedSample * 0x8000 : expectedSample * 0x7fff
    const actualInt16 = view.getInt16(44, true)
    // Allow small rounding difference
    expect(Math.abs(actualInt16 - expectedInt16)).toBeLessThanOrEqual(1)
  })
})
