export interface WhisperConfig {
  apiKey: string
  model?: string
  baseUrl?: string
  language?: string
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

  /**
   * Transcribe audio chunk using Whisper API
   * Returns the transcribed text
   */
  async transcribe(audioBlob: Blob): Promise<string> {
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
  }
}
