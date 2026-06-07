import { create } from 'zustand'
import { useSubtitleStore } from './subtitleStore'
import { useSettingsStore } from './settingsStore'
import { useHistoryStore } from './historyStore'
import { SummaryService } from '../services/summary.service'
import type { SubtitleEntry } from '@shared/types'

export interface GenerateSummaryOptions {
  entries?: SubtitleEntry[]
  sessionId?: string
}

interface SummaryState {
  summary: string | null
  isGenerating: boolean
  sessionGeneratingId: string | null
  setSummary: (summary: string | null) => void
  setIsGenerating: (v: boolean) => void
  generateSummary: (opts?: GenerateSummaryOptions) => Promise<void>
  loadSummary: () => Promise<void>
  reset: () => void
}

const STORAGE_KEY = 'summary'

export const useSummaryStore = create<SummaryState>((set, get) => ({
  summary: null,
  isGenerating: false,
  sessionGeneratingId: null,

  setSummary: (summary) => {
    set({ summary })
    window.api?.store?.set(STORAGE_KEY, summary).catch(err => console.error('[Summary] Persist error:', err))
    // Sync summary to the latest saved history session
    if (summary) {
      useHistoryStore.getState().updateLatestSummary(summary)
    }
  },

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  generateSummary: async (opts?: GenerateSummaryOptions) => {
    const entries = opts?.entries ?? useSubtitleStore.getState().entries
    const confirmedEntries = entries.filter((e) => e.isFinal)
    if (confirmedEntries.length === 0) return

    set({ isGenerating: true, sessionGeneratingId: opts?.sessionId ?? null })
    try {
      const settings = useSettingsStore.getState().settings
      const { apiKey, baseUrl, model } = settings.ai.translator

      if (!apiKey) {
        set({ summary: '请先在设置中配置 API Key' })
        return
      }

      const templates = settings.general.summaryTemplates
      const template = templates.find((t) => t.id === settings.general.activeTemplateId) || templates[0]
      const systemPrompt = template?.systemPrompt || ''
      const userMessage = template?.userMessageTemplate || '{{content}}'

      const service = new SummaryService({ apiKey, model, baseUrl, systemPrompt, userMessage })

      const fullText = confirmedEntries
        .map((e) => `${e.originalText}\n${e.translatedText}`)
        .join('\n\n')

      let result = ''
      for await (const chunk of service.streamingSummarize(fullText)) {
        result = chunk.text
      }

      if (opts?.sessionId) {
        // Generated from history — update that specific session
        useHistoryStore.getState().updateSessionSummary(opts.sessionId, result)
      } else {
        // Generated from live session — use the existing flow
        get().setSummary(result)
      }
    } catch (err) {
      console.error('Summary generation error:', err)
      if (!opts?.sessionId) {
        set({ summary: '生成摘要时出错，请检查 API 配置' })
      }
    } finally {
      set({ isGenerating: false, sessionGeneratingId: null })
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
