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
  loadSummary: () => Promise<void>
  reset: () => void
}

const STORAGE_KEY = 'summary'

export const useSummaryStore = create<SummaryState>((set, get) => ({
  summary: null,
  isGenerating: false,

  setSummary: (summary) => {
    set({ summary })
    window.api?.store?.set(STORAGE_KEY, summary).catch(err => console.error('[Summary] Persist error:', err))
  },

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  generateSummary: async () => {
    const entries = useSubtitleStore.getState().entries
    const confirmedEntries = entries.filter((e) => e.isFinal)
    if (confirmedEntries.length === 0) return

    set({ isGenerating: true })
    try {
      const settings = useSettingsStore.getState().settings
      const { apiKey, baseUrl, model } = settings.ai.translator
      const customPrompt = settings.general.summaryPrompt || ''

      if (!apiKey) {
        set({ summary: '请先在设置中配置 DeepSeek API Key' })
        return
      }

      const service = new SummaryService({ apiKey, model, baseUrl, summaryPrompt: customPrompt })

      const fullText = confirmedEntries
        .map((e) => `${e.originalText}\n${e.translatedText}`)
        .join('\n\n')

      let result = ''
      for await (const chunk of service.streamingSummarize(fullText)) {
        result = chunk.text
      }
      get().setSummary(result)
    } catch (err) {
      console.error('Summary generation error:', err)
      set({ summary: '生成摘要时出错，请检查 API 配置' })
    } finally {
      set({ isGenerating: false })
    }
  },

  reset: () => {
    set({ summary: null, isGenerating: false })
    window.api?.store?.set(STORAGE_KEY, null).catch(err => console.error('[Summary] Reset persist error:', err))
  },

  loadSummary: async () => {
    try {
      const saved = await window.api?.store?.get(STORAGE_KEY)
      if (saved && typeof saved === 'string') {
        set({ summary: saved })
      }
    } catch (err) {
      console.error('[Summary] Failed to load:', err)
    }
  }
}))
