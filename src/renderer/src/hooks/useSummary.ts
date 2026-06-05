import { useState, useCallback } from 'react'
import { useSubtitleStore } from '../store/subtitleStore'
import { useSettingsStore } from '../store/settingsStore'
import { SummaryService } from '../services/summary.service'

export function useSummary() {
  const [summary, setSummary] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const entries = useSubtitleStore((s) => s.entries)

  const generateSummary = useCallback(async () => {
    const confirmedEntries = entries.filter((e) => e.isFinal)
    if (confirmedEntries.length === 0) return

    setIsGenerating(true)
    try {
      const settings = useSettingsStore.getState().settings
      const { apiKey, baseUrl, model } = settings.ai.translator

      if (!apiKey) {
        setSummary('请先在设置中配置 DeepSeek API Key')
        return
      }

      const service = new SummaryService({ apiKey, model, baseUrl })

      const fullText = confirmedEntries
        .map((e) => `${e.originalText}\n${e.translatedText}`)
        .join('\n\n')

      let result = ''
      for await (const chunk of service.streamingSummarize(fullText)) {
        result = chunk.text
      }
      setSummary(result)
    } catch (err) {
      console.error('Summary generation error:', err)
      setSummary('生成摘要时出错，请检查 API 配置')
    } finally {
      setIsGenerating(false)
    }
  }, [entries])

  return { summary, isGenerating, generateSummary, setSummary }
}
