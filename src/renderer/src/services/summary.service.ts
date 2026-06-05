export interface SummaryConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

export interface SummaryResult {
  text: string
  isDone: boolean
}

const SUMMARY_SYSTEM_PROMPT = `你是一位专业的知识整理与会议记录分析师。

你的任务是将翻译后的演讲/会议/课程内容整理为结构化的思维导图大纲。

输出规范：
- 严格使用 Markdown 标题层级格式
- 一级标题（#）：仅 1 个，为整个内容的主题
- 二级标题（##）：3-7 个主要议题/章节
- 三级标题（###）：每个议题下的 2-5 个关键要点
- 四级列表（-）：补充细节、数据、例子

内容要求：
- 语言统一为中文
- 相似内容合并，避免重复
- 保持逻辑顺序（按内容时间线或主题分组）
- 每个节点文字精炼，适合在思维导图节点中显示（不超过 20 字为佳）
- 去除口语化重复和无意义语气词
- 保留关键数据、人名、专业术语`

export class SummaryService {
  private apiKey: string
  private model: string
  private baseUrl: string

  constructor(config: SummaryConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || 'deepseek-chat'
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com'
  }

  async *streamingSummarize(text: string): AsyncGenerator<SummaryResult> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
          { role: 'user', content: `请对以下内容生成结构化的思维导图大纲：\n\n${text}` }
        ],
        stream: true,
        temperature: 0.3,
        max_tokens: 4096
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Summary API error: ${response.status} - ${error}`)
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
}
