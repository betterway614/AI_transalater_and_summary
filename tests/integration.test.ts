import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockApi = {
  ai: { transcribe: vi.fn(), chatCompletion: vi.fn(), chatCompletionStream: vi.fn(), testConnection: vi.fn() },
  store: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue({ success: true }) },
  ytdlp: { onProgress: vi.fn().mockReturnValue(() => {}), extractAudio: vi.fn(), getInfo: vi.fn(), cancel: vi.fn(), setCookies: vi.fn() },
  floating: { show: vi.fn().mockResolvedValue(true), hide: vi.fn().mockResolvedValue(true), updateSubtitles: vi.fn().mockResolvedValue(true), updateTheme: vi.fn().mockResolvedValue(true), updateSummary: vi.fn().mockResolvedValue(true), setExpanded: vi.fn() },
  exportMarkdown: vi.fn().mockResolvedValue('/tmp/test.md'),
  logToMain: vi.fn()
}

Object.defineProperty(window, 'api', { value: mockApi, writable: true })

/** Helper: mock chatCompletionStream to call onChunk once then resolve */
function mockStream(text: string) {
  mockApi.ai.chatCompletionStream.mockImplementationOnce(
    (_config: any, onChunk: (t: string) => void) => {
      onChunk(text)
      return Promise.resolve(text)
    }
  )
}

import { useSubtitleStore } from '../src/renderer/src/store/subtitleStore'
import { useAppStore } from '../src/renderer/src/store/appStore'
import { WhisperService } from '../src/renderer/src/services/whisper.service'
import { DeepSeekService } from '../src/renderer/src/services/deepseek.service'
import { detectVoiceActivity, pcmToWav } from '../src/renderer/src/services/audio-processor'

describe('Integration: Full Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSubtitleStore.getState().clearEntries()
    useAppStore.getState().reset()
  })

  it('should complete full pipeline: audio → VAD → WAV → ASR → translate → subtitle', async () => {
    const audioData = createVoiceAudio()
    const hasVoice = detectVoiceActivity(audioData, -40)
    expect(hasVoice).toBe(true)

    const wavBuffer = pcmToWav(audioData, 16000)
    expect(wavBuffer.byteLength).toBeGreaterThan(44)
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' })
    expect(wavBlob.size).toBeGreaterThan(44)

    mockApi.ai.transcribe.mockResolvedValueOnce({ text: 'Hello, this is a test sentence.' })
    const whisper = new WhisperService({ apiKey: 'test-key' })
    const transcribedText = await whisper.transcribe(wavBlob)
    expect(transcribedText).toBe('Hello, this is a test sentence.')

    mockStream('你好，这是一个测试句子。')
    const deepseek = new DeepSeekService({ apiKey: 'test-key' })
    let translatedText = ''
    for await (const chunk of deepseek.streamingTranslate(transcribedText)) {
      translatedText = chunk.text
    }
    expect(translatedText).toBe('你好，这是一个测试句子。')

    const store = useSubtitleStore.getState()
    const entry = store.createEntry(transcribedText, 'microphone')
    store.addEntry(entry)
    store.updateEntry(entry.id, translatedText)
    store.replaceLastEntry({ ...entry, translatedText, isFinal: true })

    const entries = useSubtitleStore.getState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0].originalText).toBe('Hello, this is a test sentence.')
    expect(entries[0].translatedText).toBe('你好，这是一个测试句子。')
    expect(entries[0].isFinal).toBe(true)
    expect(entries[0].mode).toBe('microphone')
  })

  it('should skip silent audio chunks (VAD filter)', () => {
    const audioData = createSilentAudio()
    const hasVoice = detectVoiceActivity(audioData, -40)
    expect(hasVoice).toBe(false)
    expect(useSubtitleStore.getState().entries).toHaveLength(0)
  })

  it('should handle multiple sequential translations with context', async () => {
    const store = useSubtitleStore.getState()
    mockApi.ai.transcribe.mockResolvedValueOnce({ text: 'First sentence.' })
    mockStream('第一句话。')

    const whisper = new WhisperService({ apiKey: 'test-key' })
    const deepseek = new DeepSeekService({ apiKey: 'test-key' })

    const text1 = await whisper.transcribe(new Blob())
    let trans1 = ''
    for await (const chunk of deepseek.streamingTranslate(text1)) {
      trans1 = chunk.text
    }
    store.addEntry({ ...store.createEntry(text1, 'url'), translatedText: trans1, isFinal: true })

    mockApi.ai.transcribe.mockResolvedValueOnce({ text: 'Second sentence.' })
    mockStream('第二句话。')

    const text2 = await whisper.transcribe(new Blob())
    const context = useSubtitleStore.getState().entries.filter(e => e.isFinal).slice(-3).map(e => e.originalText)
    expect(context).toEqual(['First sentence.'])

    let trans2 = ''
    for await (const chunk of deepseek.streamingTranslate(text2, context)) {
      trans2 = chunk.text
    }
    store.addEntry({ ...store.createEntry(text2, 'url'), translatedText: trans2, isFinal: true })

    const entries = useSubtitleStore.getState().entries
    expect(entries).toHaveLength(2)
    expect(entries[0].originalText).toBe('First sentence.')
    expect(entries[0].translatedText).toBe('第一句话。')
    expect(entries[1].originalText).toBe('Second sentence.')
    expect(entries[1].translatedText).toBe('第二句话。')
  })

  it('should handle ASR error gracefully after retries', async () => {
    mockApi.ai.transcribe.mockRejectedValue(new Error('Whisper API error: 500'))

    const whisper = new WhisperService({ apiKey: 'test-key' })
    await expect(whisper.transcribe(new Blob())).rejects.toThrow('Whisper API error: 500')
    expect(useSubtitleStore.getState().entries).toHaveLength(0)
  }, 15000)

  it('should handle translation error gracefully after retries', async () => {
    mockApi.ai.chatCompletionStream.mockRejectedValue(new Error('DeepSeek API error: 429'))

    const deepseek = new DeepSeekService({ apiKey: 'test-key' })
    await expect(deepseek.streamingTranslate('test').next()).rejects.toThrow('DeepSeek API error: 429')
    expect(useSubtitleStore.getState().entries).toHaveLength(0)
  }, 15000)

  it('should verify WAV output is parseable by standard tools', () => {
    const audio = createVoiceAudio()
    const wav = pcmToWav(audio, 16000)
    const view = new DataView(wav)

    const readStr = (offset: number, len: number) => {
      let s = ''
      for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i))
      return s
    }

    expect(readStr(0, 4)).toBe('RIFF')
    expect(readStr(8, 4)).toBe('WAVE')
    expect(readStr(12, 4)).toBe('fmt ')
    expect(view.getUint32(16, true)).toBe(16)
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint32(28, true)).toBe(32000)
    expect(view.getUint16(32, true)).toBe(2)
    expect(view.getUint16(34, true)).toBe(16)
    expect(readStr(36, 4)).toBe('data')
    expect(view.getUint32(40, true)).toBe(audio.length * 2)
  })
})

function createVoiceAudio(): Float32Array {
  const sampleRate = 16000
  const samples = new Float32Array(sampleRate)
  for (let i = 0; i < samples.length; i++) {
    samples[i] = 0.3 * Math.sin((2 * Math.PI * 440 * i) / sampleRate)
  }
  return samples
}

function createSilentAudio(): Float32Array {
  return new Float32Array(16000).fill(0.00001)
}
