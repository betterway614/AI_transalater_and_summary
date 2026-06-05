import { useState, useCallback } from 'react'
import { useSubtitleStore } from '../store/subtitleStore'

export function useSummary() {
  const [summary, setSummary] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const entries = useSubtitleStore((s) => s.entries)

  const generateSummary = useCallback(async () => {
    const confirmedEntries = entries.filter((e) => e.isFinal)
    if (confirmedEntries.length === 0) return

    setIsGenerating(true)
    try {
      const fullText = confirmedEntries.map((e) => `${e.originalText}\n${e.translatedText}`).join('\n\n')

      // Use DeepSeek to generate summary
      const settings = (await window.api?.store.get('settings')) as any
      const apiKey = settings?.ai?.translator?.apiKey || ''
      const baseUrl = settings?.ai?.translator?.baseUrl || 'https://api.deepseek.com'
      const model = settings?.ai?.translator?.model || 'deepseek-chat'

      if (!apiKey) {
        setSummary('请先在设置中配置 API Key')
        return
      }

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional summarizer. Create a structured Markdown summary in Chinese with clear headings and bullet points.'
            },
            {
              role: 'user',
              content: `请对以下翻译内容生成结构化摘要（Markdown格式，使用三级标题）：\n\n${fullText}`
            }
          ],
          temperature: 0.3,
          max_tokens: 2048
        })
      })

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || '生成失败'
      setSummary(content)
    } catch (err) {
      console.error('Summary generation error:', err)
      setSummary('生成摘要时出错')
    } finally {
      setIsGenerating(false)
    }
  }, [entries])

  return { summary, isGenerating, generateSummary, setSummary }
}
