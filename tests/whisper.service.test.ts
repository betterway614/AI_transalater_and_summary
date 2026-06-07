import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockApi = {
  ai: { transcribe: vi.fn(), chatCompletion: vi.fn(), testConnection: vi.fn() },
  store: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue({ success: true }) },
  ytdlp: { onProgress: vi.fn().mockReturnValue(() => {}), extractAudio: vi.fn(), getInfo: vi.fn(), cancel: vi.fn(), setCookies: vi.fn() },
  floating: { show: vi.fn().mockResolvedValue(true), hide: vi.fn().mockResolvedValue(true), updateSubtitles: vi.fn().mockResolvedValue(true), updateTheme: vi.fn().mockResolvedValue(true), updateSummary: vi.fn().mockResolvedValue(true), setExpanded: vi.fn() },
  exportMarkdown: vi.fn().mockResolvedValue('/tmp/test.md'),
  logToMain: vi.fn()
}

Object.defineProperty(window, 'api', { value: mockApi, writable: true })

import { WhisperService } from '../src/renderer/src/services/whisper.service'

describe('WhisperService', () => {
  let service: WhisperService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new WhisperService({ apiKey: 'test-key', model: 'whisper-1', language: 'en' })
  })

  it('should call Whisper API with correct parameters', async () => {
    mockApi.ai.transcribe.mockResolvedValueOnce({ text: 'Hello world' })

    const audioBlob = new Blob([new ArrayBuffer(1024)], { type: 'audio/wav' })
    const result = await service.transcribe(audioBlob)

    expect(result).toBe('Hello world')
    expect(mockApi.ai.transcribe).toHaveBeenCalledTimes(1)
    const call = mockApi.ai.transcribe.mock.calls[0][0]
    expect(call.baseUrl).toBe('https://api.openai.com')
    expect(call.apiKey).toBe('test-key')
    expect(call.model).toBe('whisper-1')
    expect(call.language).toBe('en')
  })

  it('should throw on API error after retries exhausted', async () => {
    mockApi.ai.transcribe.mockRejectedValue(new Error('Whisper API error: 401'))

    const audioBlob = new Blob([new ArrayBuffer(1024)], { type: 'audio/wav' })
    await expect(service.transcribe(audioBlob)).rejects.toThrow('Whisper API error: 401')
  }, 15000)

  it('should trim whitespace from result', async () => {
    mockApi.ai.transcribe.mockResolvedValueOnce({ text: '  Hello world  \n' })
    const result = await service.transcribe(new Blob())
    expect(result).toBe('  Hello world  \n')
  })

  it('should handle empty response', async () => {
    mockApi.ai.transcribe.mockResolvedValueOnce({ text: '' })
    const result = await service.transcribe(new Blob())
    expect(result).toBe('')
  })
})
