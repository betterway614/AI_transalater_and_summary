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
  updateGeneral: (partial: Partial<AppSettings['general']>) => void
  loadSettings: (settings: AppSettings) => void
  init: () => Promise<void>
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
      if (saved) {
        set({ settings: deepMerge(DEFAULT_SETTINGS, saved), isLoaded: true })
      } else {
        set({ isLoaded: true })
      }
    } catch {
      set({ isLoaded: true })
    }
  }
}))
