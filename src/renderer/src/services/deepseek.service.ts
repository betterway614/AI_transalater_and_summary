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

  async *streamingTranslate(text: string, context: string[] = []): AsyncGenerator<TranslateResult> {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...context.map((t) => ({ role: 'user', content: `Translate to Chinese: ${t}` })),
      { role: 'user', content: `Translate to Chinese: ${text}` }
    ]

    const chunks: string[] = []
    let resolve: (() => void) | null = null
    let finished = false
    let error: Error | null = null

    const finalPromise = window.api.ai.chatCompletionStream(
      {
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
        model: this.model,
        messages: messages as Array<{ role: string; content: string }>,
        temperature: 0.3,
        maxTokens: 1024
      },
      (chunk) => {
        chunks.push(chunk)
        resolve?.()
        resolve = null
      }
    ).then((final) => {
      finished = true
      resolve?.()
      resolve = null
      return final
    }).catch((e) => {
      error = e
      finished = true
      resolve?.()
      resolve = null
    })

    let idx = 0
    while (!finished || idx < chunks.length) {
      if (idx < chunks.length) {
        yield { text: chunks[idx], isDone: false }
        idx++
      } else {
        await new Promise<void>((r) => { resolve = r })
      }
    }

    if (error) throw error
    const finalText = await finalPromise
    yield { text: finalText, isDone: true }
  }

  async translate(text: string, context: string[] = []): Promise<string> {
    let result = ''
    for await (const chunk of this.streamingTranslate(text, context)) {
      result = chunk.text
    }
    return result
  }
}
