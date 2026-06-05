const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions'

export interface WhisperConfig {
  apiKey: string
  model?: string
  language?: string
}

export class WhisperService {
  private apiKey: string
  private model: string
  private language: string

  constructor(config: WhisperConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || 'whisper-1'
    this.language = config.language || 'en'
  }

  /**
   * Transcribe audio chunk using Whisper API
   * Returns the transcribed text
   */
  async transcribe(audioBlob: Blob): Promise<string> {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.wav')
    formData.append('model', this.model)
    formData.append('language', this.language)
    formData.append('response_format', 'text')

    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Whisper API error: ${response.status} - ${error}`)
    }

    const text = await response.text()
    return text.trim()
  }
}
