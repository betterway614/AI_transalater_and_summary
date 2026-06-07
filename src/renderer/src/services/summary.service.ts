export interface SummaryConfig {
  apiKey: string
  model?: string
  baseUrl?: string
  systemPrompt: string
  userMessage: string
}

export interface SummaryResult {
  text: string
  isDone: boolean
}

export class SummaryService {
  private apiKey: string
  private model: string
  private baseUrl: string
  private systemPrompt: string
  private userMessage: string

  constructor(config: SummaryConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || 'deepseek-chat'
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com'
    this.systemPrompt = config.systemPrompt
    this.userMessage = config.userMessage
  }

  async *streamingSummarize(text: string): AsyncGenerator<SummaryResult> {
    const result = await window.api.ai.chatCompletion({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.model,
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: this.userMessage.replace('{{content}}', text) }
      ],
      temperature: 0.3,
      maxTokens: 4096
    })

    yield { text: result.text, isDone: true }
  }
}
