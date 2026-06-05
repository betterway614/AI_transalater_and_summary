import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { DeepSeekService } from '../src/renderer/src/services/deepseek.service'

describe('DeepSeekService', () => {
  let service: DeepSeekService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DeepSeekService({
      apiKey: 'test-key',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com'
    })
  })

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

    return {
      ok: true,
      body: stream
    }
  }

  it('should call API with correct URL and headers', async () => {
    mockFetch.mockResolvedValueOnce(
      createSSEResponse([
        'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n',
        'data: [DONE]\n\n'
      ])
    )

    const results: string[] = []
    for await (const chunk of service.streamingTranslate('Hello')) {
      results.push(chunk.text)
    }

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toBe('Bearer test-key')

    const body = JSON.parse(options.body)
    expect(body.model).toBe('deepseek-chat')
    expect(body.stream).toBe(true)
  })

  it('should accumulate streaming translation', async () => {
    mockFetch.mockResolvedValueOnce(
      createSSEResponse([
        'data: {"choices":[{"delta":{"content":"你"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"好"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"世界"}}]}\n\n',
        'data: [DONE]\n\n'
      ])
    )

    const results: string[] = []
    for await (const chunk of service.streamingTranslate('Hello world')) {
      results.push(chunk.text)
    }

    expect(results).toEqual(['你', '你好', '你好世界', '你好世界'])
    expect(results[results.length - 1]).toBe('你好世界')
  })

  it('should include context in messages', async () => {
    mockFetch.mockResolvedValueOnce(
      createSSEResponse(['data: {"choices":[{"delta":{"content":"翻译"}}]}\n\n', 'data: [DONE]\n\n'])
    )

    const context = ['Previous sentence 1', 'Previous sentence 2']
    const results: string[] = []
    for await (const chunk of service.streamingTranslate('Current sentence', context)) {
      results.push(chunk.text)
    }

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    // system + 2 context + 1 current = 4 messages
    expect(body.messages).toHaveLength(4)
    expect(body.messages[0].role).toBe('system')
    expect(body.messages[1].content).toContain('Previous sentence 1')
    expect(body.messages[3].content).toContain('Current sentence')
  })

  it('should throw on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited')
    })

    const gen = service.streamingTranslate('test')
    await expect(gen.next()).rejects.toThrow('DeepSeek API error: 429')
  })

  it('should handle non-streaming translate', async () => {
    mockFetch.mockResolvedValueOnce(
      createSSEResponse([
        'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"世界"}}]}\n\n',
        'data: [DONE]\n\n'
      ])
    )

    const result = await service.translate('Hello world')
    expect(result).toBe('你好世界')
  })

  it('should mark isDone on final chunk', async () => {
    mockFetch.mockResolvedValueOnce(
      createSSEResponse([
        'data: {"choices":[{"delta":{"content":"翻译"}}]}\n\n',
        'data: [DONE]\n\n'
      ])
    )

    const results: Array<{ text: string; isDone: boolean }> = []
    for await (const chunk of service.streamingTranslate('test')) {
      results.push({ text: chunk.text, isDone: chunk.isDone })
    }

    expect(results[results.length - 1].isDone).toBe(true)
  })
})
