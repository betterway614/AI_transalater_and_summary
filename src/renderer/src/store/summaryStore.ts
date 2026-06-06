import { create } from 'zustand'
import { useSubtitleStore } from './subtitleStore'
import { useSettingsStore } from './settingsStore'
import { SummaryService } from '../services/summary.service'

interface SummaryState {
  summary: string | null
  isGenerating: boolean
  setSummary: (summary: string | null) => void
  setIsGenerating: (v: boolean) => void
  generateSummary: () => Promise<void>
  reset: () => void
}

export const useSummaryStore = create<SummaryState>((set, get) => ({
  summary: null,
  isGenerating: false,

  setSummary: (summary) => set({ summary }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),

  generateSummary: async () => {
    const entries = useSubtitleStore.getState().entries
    const confirmedEntries = entries.filter((e) => e.isFinal)
    if (confirmedEntries.length === 0) return

    set({ isGenerating: true })
    try {
      const settings = useSettingsStore.getState().settings
      const { apiKey, baseUrl, model } = settings.ai.translator

      if (!apiKey) {
        set({ summary: '请先在设置中配置 DeepSeek API Key' })
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
      set({ summary: result })
    } catch (err) {
      console.error('Summary generation error:', err)
      set({ summary: '生成摘要时出错，请检查 API 配置' })
    } finally {
      set({ isGenerating: false })
    }
  },

  reset: () => set({ summary: null, isGenerating: false })
}))
