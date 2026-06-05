import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch before importing service
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { WhisperService } from '../src/renderer/src/services/whisper.service'

describe('WhisperService', () => {
  let service: WhisperService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new WhisperService({
      apiKey: 'test-key',
      model: 'whisper-1',
      language: 'en'
    })
  })

  it('should call Whisper API with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('Hello world')
    })

    const audioBlob = new Blob([new ArrayBuffer(1024)], { type: 'audio/wav' })
    const result = await service.transcribe(audioBlob)

    expect(result).toBe('Hello world')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toBe('Bearer test-key')

    // Verify FormData was used
    const formData = options.body as FormData
    expect(formData).toBeInstanceOf(FormData)
  })

  it('should throw on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized')
    })

    const audioBlob = new Blob([new ArrayBuffer(1024)], { type: 'audio/wav' })

    await expect(service.transcribe(audioBlob)).rejects.toThrow('Whisper API error: 401')
  })

  it('should trim whitespace from result', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('  Hello world  \n')
    })

    const result = await service.transcribe(new Blob())
    expect(result).toBe('Hello world')
  })

  it('should handle empty response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('')
    })

    const result = await service.transcribe(new Blob())
    expect(result).toBe('')
  })
})
