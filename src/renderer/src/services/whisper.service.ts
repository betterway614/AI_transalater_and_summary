export interface WhisperConfig {
  apiKey: string
  model?: string
  baseUrl?: string
  language?: string
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries) throw err
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
      console.warn(`[Whisper] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, err)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('Unreachable')
}

export class WhisperService {
  private apiKey: string
  private model: string
  private baseUrl: string
  private language: string

  constructor(config: WhisperConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || 'whisper-1'
    this.baseUrl = config.baseUrl || 'https://api.openai.com'
    this.language = config.language || 'auto'
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    return retryWithBackoff(async () => {
      const arrayBuffer = await audioBlob.arrayBuffer()
      console.log(`[Whisper] POST ${this.baseUrl}/v1/audio/transcriptions blob=${audioBlob.size}B model=${this.model} lang=${this.language}`)
      const result = await window.api.ai.transcribe({
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
        model: this.model,
        language: this.language,
        audioData: arrayBuffer
      })
      console.log(`[Whisper] Response: "${result.text.substring(0, 100)}"`)
      return result.text
    })
  }
}
