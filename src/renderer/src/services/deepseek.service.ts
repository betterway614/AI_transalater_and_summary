export interface DeepSeekConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

export interface TranslateResult {
  text: string
  isDone: boolean
}

const SYSTEM_PROMPT = `You are a professional translator. Translate the following text to Chinese.
Rules:
- Output ONLY the translated text, nothing else
- Maintain the original meaning and tone
- If the text is already in Chinese, output it as-is
- Keep technical terms accurate
- Be concise and natural in Chinese`

export class DeepSeekService {
  private apiKey: string
  private model: string
  private baseUrl: string

  constructor(config: DeepSeekConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || 'deepseek-v4-flash'
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com'
  }

  /**
   * Translate text using DeepSeek API with streaming
   * Yields partial translations as they arrive
   */
  async *streamingTranslate(text: string, context: string[] = []): AsyncGenerator<TranslateResult> {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...context.map((t) => ({ role: 'user', content: `Translate to Chinese: ${t}` })),
      { role: 'user', content: `Translate to Chinese: ${text}` }
    ]

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 1024
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let accumulated = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          yield { text: accumulated, isDone: true }
          return
        }

        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            accumulated += delta
            yield { text: accumulated, isDone: false }
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    yield { text: accumulated, isDone: true }
  }

  /**
   * Non-streaming translate (single request)
   */
  async translate(text: string, context: string[] = []): Promise<string> {
    let result = ''
    for await (const chunk of this.streamingTranslate(text, context)) {
      result = chunk.text
    }
    return result
  }
}
