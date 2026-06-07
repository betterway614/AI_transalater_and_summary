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

import { DeepSeekService } from '../src/renderer/src/services/deepseek.service'

describe('DeepSeekService', () => {
  let service: DeepSeekService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DeepSeekService({ apiKey: 'test-key', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' })
  })

  it('should call API with correct URL and headers', async () => {
    mockApi.ai.chatCompletion.mockResolvedValueOnce({ text: '你好' })

    const results: string[] = []
    for await (const chunk of service.streamingTranslate('Hello')) {
      results.push(chunk.text)
    }

    const call = mockApi.ai.chatCompletion.mock.calls[0][0]
    expect(call.baseUrl).toBe('https://api.deepseek.com')
    expect(call.apiKey).toBe('test-key')
    expect(call.model).toBe('deepseek-chat')
  })

  it('should accumulate streaming translation', async () => {
    mockApi.ai.chatCompletion.mockResolvedValueOnce({ text: '你好世界' })

    const results: string[] = []
    for await (const chunk of service.streamingTranslate('Hello world')) {
      results.push(chunk.text)
    }
    expect(results[results.length - 1]).toBe('你好世界')
  })

  it('should include context in messages', async () => {
    mockApi.ai.chatCompletion.mockResolvedValueOnce({ text: '翻译' })

    const context = ['Previous sentence 1', 'Previous sentence 2']
    const results: string[] = []
    for await (const chunk of service.streamingTranslate('Current sentence', context)) {
      results.push(chunk.text)
    }

    const call = mockApi.ai.chatCompletion.mock.calls[0][0]
    expect(call.messages).toHaveLength(4)
    expect(call.messages[0].role).toBe('system')
    expect(call.messages[1].content).toContain('Previous sentence 1')
    expect(call.messages[3].content).toContain('Current sentence')
  })

  it('should throw on API error after retries exhausted', async () => {
    mockApi.ai.chatCompletion.mockRejectedValue(new Error('DeepSeek API error: 429'))

    const gen = service.streamingTranslate('test')
    await expect(gen.next()).rejects.toThrow('DeepSeek API error: 429')
  }, 15000)

  it('should handle non-streaming translate', async () => {
    mockApi.ai.chatCompletion.mockResolvedValueOnce({ text: '你好世界' })

    const result = await service.translate('Hello world')
    expect(result).toBe('你好世界')
  })

  it('should mark isDone on final chunk', async () => {
    mockApi.ai.chatCompletion.mockResolvedValueOnce({ text: '翻译' })

    const results: Array<{ text: string; isDone: boolean }> = []
    for await (const chunk of service.streamingTranslate('test')) {
      results.push({ text: chunk.text, isDone: chunk.isDone })
    }
    expect(results[results.length - 1].isDone).toBe(true)
  })
})
