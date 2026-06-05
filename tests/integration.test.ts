import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for AI services
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock AudioContext for jsdom
class MockAudioContext {
  sampleRate = 44100
  createBuffer() {
    return { getChannelData: () => new Float32Array(0) }
  }
  createBufferSource() {
    return { buffer: null, connect: () => {}, start: () => {} }
  }
  createMediaStreamSource() {
    return { connect: () => {} }
  }
  createScriptProcessor() {
    return { connect: () => {}, disconnect: () => {}, onaudioprocess: null }
  }
  async startRendering() {
    return { getChannelData: () => new Float32Array(0) }
  }
  close() {}
}
vi.stubGlobal('AudioContext', MockAudioContext)
vi.stubGlobal('OfflineAudioContext', MockAudioContext)

import { useSubtitleStore } from '../src/renderer/src/store/subtitleStore'
import { useAppStore } from '../src/renderer/src/store/appStore'
import { WhisperService } from '../src/renderer/src/services/whisper.service'
import { DeepSeekService } from '../src/renderer/src/services/deepseek.service'
import { detectVoiceActivity, pcmToWav } from '../src/renderer/src/services/audio-processor'

/**
 * Integration test: Simulate the full audio→ASR→translate→subtitle pipeline
 *
 * Pipeline:
 * 1. Audio chunk (Float32Array) → VAD check
 * 2. PCM → WAV conversion
 * 3. WAV blob → Whisper ASR → text
 * 4. Text → DeepSeek streaming translate → Chinese
 * 5. Create subtitle entry → update store
 */

function createVoiceAudio(): Float32Array {
  const sampleRate = 16000
  const duration = 1 // 1 second
  const samples = new Float32Array(sampleRate * duration)
  for (let i = 0; i < samples.length; i++) {
    samples[i] = 0.3 * Math.sin((2 * Math.PI * 440 * i) / sampleRate)
  }
  return samples
}

function createSilentAudio(): Float32Array {
  return new Float32Array(16000).fill(0.00001)
}

function createSSEResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  let index = 0
  const stream = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]))
        index++
      } else {
        controller.close()
      }
    }
  })
  return { ok: true, body: stream }
}

describe('Integration: Full Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSubtitleStore.getState().clearEntries()
    useAppStore.getState().reset()
  })

  it('should complete full pipeline: audio → VAD → WAV → ASR → translate → subtitle', async () => {
    // === Step 1: VAD detects voice ===
    const audioData = createVoiceAudio()
    const hasVoice = detectVoiceActivity(audioData, -40)
    expect(hasVoice).toBe(true)

    // === Step 2: PCM → WAV ===
    const wavBuffer = pcmToWav(audioData, 16000)
    expect(wavBuffer.byteLength).toBeGreaterThan(44)
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' })
    expect(wavBlob.size).toBeGreaterThan(44)

    // === Step 3: Whisper ASR ===
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('Hello, this is a test sentence.')
    })

    const whisper = new WhisperService({ apiKey: 'test-key' })
    const transcribedText = await whisper.transcribe(wavBlob)
    expect(transcribedText).toBe('Hello, this is a test sentence.')

    // === Step 4: DeepSeek Translation ===
    mockFetch.mockResolvedValueOnce(
      createSSEResponse([
        'data: {"choices":[{"delta":{"content":"你好，"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"这是一个测试句子。"}}]}\n\n',
        'data: [DONE]\n\n'
      ])
    )

    const deepseek = new DeepSeekService({ apiKey: 'test-key' })
    let translatedText = ''
    for await (const chunk of deepseek.streamingTranslate(transcribedText)) {
      translatedText = chunk.text
    }
    expect(translatedText).toBe('你好，这是一个测试句子。')

    // === Step 5: Create subtitle entry ===
    const store = useSubtitleStore.getState()
    const entry = store.createEntry(transcribedText, 'microphone')
    store.addEntry(entry)
    store.updateEntry(entry.id, translatedText)
    store.replaceLastEntry({
      ...entry,
      translatedText,
      isFinal: true
    })

    // === Verify final state ===
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

    // No entries should be created
    expect(useSubtitleStore.getState().entries).toHaveLength(0)
  })

  it('should handle multiple sequential translations with context', async () => {
    const store = useSubtitleStore.getState()

    // First translation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('First sentence.')
    })

    mockFetch.mockResolvedValueOnce(
      createSSEResponse([
        'data: {"choices":[{"delta":{"content":"第一句话。"}}]}\n\n',
        'data: [DONE]\n\n'
      ])
    )

    const whisper = new WhisperService({ apiKey: 'test-key' })
    const deepseek = new DeepSeekService({ apiKey: 'test-key' })

    const text1 = await whisper.transcribe(new Blob())
    let trans1 = ''
    for await (const chunk of deepseek.streamingTranslate(text1)) {
      trans1 = chunk.text
    }

    const entry1 = store.createEntry(text1, 'url')
    store.addEntry({ ...entry1, translatedText: trans1, isFinal: true })

    // Second translation (should include context)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('Second sentence.')
    })

    mockFetch.mockResolvedValueOnce(
      createSSEResponse([
        'data: {"choices":[{"delta":{"content":"第二句话。"}}]}\n\n',
        'data: [DONE]\n\n'
      ])
    )

    const text2 = await whisper.transcribe(new Blob())

    // Verify context is passed to DeepSeek
    const context = useSubtitleStore
      .getState()
      .entries.filter((e) => e.isFinal)
      .slice(-3)
      .map((e) => e.originalText)
    expect(context).toEqual(['First sentence.'])

    let trans2 = ''
    for await (const chunk of deepseek.streamingTranslate(text2, context)) {
      trans2 = chunk.text
    }

    const entry2 = store.createEntry(text2, 'url')
    store.addEntry({ ...entry2, translatedText: trans2, isFinal: true })

    // Verify both entries exist
    const entries = useSubtitleStore.getState().entries
    expect(entries).toHaveLength(2)
    expect(entries[0].originalText).toBe('First sentence.')
    expect(entries[0].translatedText).toBe('第一句话。')
    expect(entries[1].originalText).toBe('Second sentence.')
    expect(entries[1].translatedText).toBe('第二句话。')
  })

  it('should handle ASR error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error')
    })

    const whisper = new WhisperService({ apiKey: 'test-key' })

    await expect(whisper.transcribe(new Blob())).rejects.toThrow('Whisper API error: 500')
    expect(useSubtitleStore.getState().entries).toHaveLength(0)
  })

  it('should handle translation error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited')
    })

    const deepseek = new DeepSeekService({ apiKey: 'test-key' })
    const gen = deepseek.streamingTranslate('test')

    await expect(gen.next()).rejects.toThrow('DeepSeek API error: 429')
    expect(useSubtitleStore.getState().entries).toHaveLength(0)
  })

  it('should verify WAV output is parseable by standard tools', () => {
    const audio = createVoiceAudio()
    const wav = pcmToWav(audio, 16000)
    const view = new DataView(wav)

    // Verify all WAV header fields
    const readStr = (offset: number, len: number) => {
      let s = ''
      for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i))
      return s
    }

    expect(readStr(0, 4)).toBe('RIFF')
    expect(readStr(8, 4)).toBe('WAVE')
    expect(readStr(12, 4)).toBe('fmt ')
    expect(view.getUint32(16, true)).toBe(16) // chunk size
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint32(24, true)).toBe(16000) // sample rate
    expect(view.getUint32(28, true)).toBe(32000) // byte rate (16000 * 1 * 16/8)
    expect(view.getUint16(32, true)).toBe(2) // block align
    expect(view.getUint16(34, true)).toBe(16) // bits per sample
    expect(readStr(36, 4)).toBe('data')

    // Data size = samples * 2 bytes
    expect(view.getUint32(40, true)).toBe(audio.length * 2)
  })
})
