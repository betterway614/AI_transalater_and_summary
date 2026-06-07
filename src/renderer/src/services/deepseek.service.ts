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

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries) throw err
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
      console.warn(`[DeepSeek] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, err)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('Unreachable')
}

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
    const result = await retryWithBackoff(async () => {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...context.map((t) => ({ role: 'user', content: `Translate to Chinese: ${t}` })),
        { role: 'user', content: `Translate to Chinese: ${text}` }
      ]
      return await window.api.ai.chatCompletion({
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
        model: this.model,
        messages: messages as Array<{ role: string; content: string }>,
        temperature: 0.3,
        maxTokens: 1024
      })
    })
    yield { text: result.text, isDone: true }
  }

  async translate(text: string, context: string[] = []): Promise<string> {
    let result = ''
    for await (const chunk of this.streamingTranslate(text, context)) {
      result = chunk.text
    }
    return result
  }
}
