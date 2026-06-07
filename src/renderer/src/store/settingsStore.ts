import { create } from 'zustand'
import type { AppSettings, SummaryTemplate } from '@shared/types'
import { DEFAULT_SETTINGS, BUILT_IN_TEMPLATES } from '@shared/types'

interface SettingsState {
  settings: AppSettings
  isLoaded: boolean
  updateSettings: (partial: Partial<AppSettings>) => void
  updateAI: (partial: Partial<AppSettings['ai']>) => void
  updateSubtitle: (partial: Partial<AppSettings['subtitle']>) => void
  updateAudio: (partial: Partial<AppSettings['audio']>) => void
  updateGeneral: (partial: Partial<AppSettings['general']>) => void
  loadSettings: (settings: AppSettings) => void
  init: () => Promise<void>
  // 模板 CRUD
  saveTemplate: (template: SummaryTemplate) => void
  deleteTemplate: (id: string) => void
  setActiveTemplate: (id: string) => void
  resetBuiltInTemplates: () => void
}

function deepMerge<T extends Record<string, any>>(defaults: T, saved: Partial<T>): T {
  const result = { ...defaults }
  for (const key of Object.keys(saved) as Array<keyof T>) {
    const savedVal = saved[key]
    const defaultVal = defaults[key]
    if (
      savedVal && typeof savedVal === 'object' && !Array.isArray(savedVal) &&
      defaultVal && typeof defaultVal === 'object' && !Array.isArray(defaultVal)
    ) {
      result[key] = deepMerge(defaultVal as any, savedVal as any)
    } else if (savedVal !== undefined) {
      result[key] = savedVal as T[keyof T]
    }
  }
  return result
}

function persist(settings: AppSettings) {
  const hasWhisperKey = !!settings.ai.whisper.apiKey
  const hasTranslatorKey = !!settings.ai.translator.apiKey
  console.log(`[Settings] Persisting: whisperKey=${hasWhisperKey}, translatorKey=${hasTranslatorKey}`)
  window.api?.store.set('settings', settings)
    .then((result: any) => {
      if (result?.success === false) {
        console.error('[Settings] Persist failed on main process:', result.error)
      } else {
        console.log('[Settings] Persist success')
      }
    })
    .catch((err) => console.error('[Settings] Persist IPC error:', err))
}

function migrateTemplates(settings: AppSettings): AppSettings {
  if (settings.general.summaryTemplates?.length > 0) return settings
  const templates = BUILT_IN_TEMPLATES.map((t) => ({ ...t }))
  if (settings.general.summaryPrompt) {
    templates.push({
      id: crypto.randomUUID(),
      name: '旧自定义提示词',
      icon: 'SettingsIcon',
      systemPrompt: settings.general.summaryPrompt,
      userMessageTemplate: '请对以下内容生成结构化的思维导图大纲：\n\n{{content}}',
      isBuiltIn: false,
    })
  }
  return {
    ...settings,
    general: {
      ...settings.general,
      summaryTemplates: templates,
      activeTemplateId: templates[0].id,
    },
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  updateSettings: (partial) =>
    set((state) => {
      const next = { ...state.settings, ...partial }
      persist(next)
      return { settings: next }
    }),

  updateAI: (partial) =>
    set((state) => {
      const next = { ...state.settings, ai: { ...state.settings.ai, ...partial } }
      persist(next)
      return { settings: next }
    }),

  updateSubtitle: (partial) =>
    set((state) => {
      const next = { ...state.settings, subtitle: { ...state.settings.subtitle, ...partial } }
      persist(next)
      return { settings: next }
    }),

  updateAudio: (partial) =>
    set((state) => {
      const next = { ...state.settings, audio: { ...state.settings.audio, ...partial } }
      persist(next)
      return { settings: next }
    }),

  updateGeneral: (partial) =>
    set((state) => {
      const next = { ...state.settings, general: { ...state.settings.general, ...partial } }
      persist(next)
      return { settings: next }
    }),

  loadSettings: (settings) => set({ settings, isLoaded: true }),

  init: async () => {
    try {
      const saved = (await window.api?.store.get('settings')) as AppSettings | undefined
      console.log('[Settings] Loaded from disk:', saved ? `apiKey whisper=${saved.ai?.whisper?.apiKey ? 'YES' : 'NO'}, translator=${saved.ai?.translator?.apiKey ? 'YES' : 'NO'}` : 'null')
      if (saved) {
        const merged = deepMerge(DEFAULT_SETTINGS, saved)
        const migrated = migrateTemplates(merged)
        set({ settings: migrated, isLoaded: true })
        if (migrated.general.summaryTemplates !== merged.general.summaryTemplates) {
          persist(migrated)
        }
      } else {
        set({ isLoaded: true })
      }
    } catch (err) {
      console.error('[Settings] Load failed:', err)
      set({ isLoaded: true })
    }
  },

  saveTemplate: (template) =>
    set((state) => {
      const templates = state.settings.general.summaryTemplates
      const idx = templates.findIndex((t) => t.id === template.id)
      const nextTemplates = idx >= 0
        ? [...templates.slice(0, idx), template, ...templates.slice(idx + 1)]
        : [...templates, template]
      const next = {
        ...state.settings,
        general: { ...state.settings.general, summaryTemplates: nextTemplates },
      }
      persist(next)
      return { settings: next }
    }),

  deleteTemplate: (id) =>
    set((state) => {
      const templates = state.settings.general.summaryTemplates.filter((t) => t.id !== id)
      const activeId = state.settings.general.activeTemplateId === id
        ? (templates[0]?.id || '')
        : state.settings.general.activeTemplateId
      const next = {
        ...state.settings,
        general: { ...state.settings.general, summaryTemplates: templates, activeTemplateId: activeId },
      }
      persist(next)
      return { settings: next }
    }),

  setActiveTemplate: (id) =>
    set((state) => {
      const next = {
        ...state.settings,
        general: { ...state.settings.general, activeTemplateId: id },
      }
      persist(next)
      return { settings: next }
    }),

  resetBuiltInTemplates: () =>
    set((state) => {
      const customTemplates = state.settings.general.summaryTemplates.filter((t) => !t.isBuiltIn)
      const nextTemplates = [...BUILT_IN_TEMPLATES, ...customTemplates]
      const next = {
        ...state.settings,
        general: { ...state.settings.general, summaryTemplates: nextTemplates },
      }
      persist(next)
      return { settings: next }
    }),
}))
