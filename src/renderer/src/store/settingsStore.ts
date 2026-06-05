import { create } from 'zustand'
import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'

interface SettingsState {
  settings: AppSettings
  isLoaded: boolean
  updateSettings: (partial: Partial<AppSettings>) => void
  updateAI: (partial: Partial<AppSettings['ai']>) => void
  updateSubtitle: (partial: Partial<AppSettings['subtitle']>) => void
  updateAudio: (partial: Partial<AppSettings['audio']>) => void
  loadSettings: (settings: AppSettings) => void
  init: () => Promise<void>
}

function persist(settings: AppSettings) {
  window.api?.store.set('settings', settings).catch(() => {})
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

  loadSettings: (settings) => set({ settings, isLoaded: true }),

  init: async () => {
    try {
      const saved = (await window.api?.store.get('settings')) as AppSettings | undefined
      if (saved) {
        set({ settings: { ...DEFAULT_SETTINGS, ...saved }, isLoaded: true })
      } else {
        set({ isLoaded: true })
      }
    } catch {
      set({ isLoaded: true })
    }
  }
}))
