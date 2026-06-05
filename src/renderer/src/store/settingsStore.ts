import { create } from 'zustand'
import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'

interface SettingsState {
  settings: AppSettings
  updateSettings: (partial: Partial<AppSettings>) => void
  updateAI: (partial: Partial<AppSettings['ai']>) => void
  updateSubtitle: (partial: Partial<AppSettings['subtitle']>) => void
  updateAudio: (partial: Partial<AppSettings['audio']>) => void
  loadSettings: (settings: AppSettings) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,

  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  updateAI: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ai: { ...state.settings.ai, ...partial } }
    })),

  updateSubtitle: (partial) =>
    set((state) => ({
      settings: { ...state.settings, subtitle: { ...state.settings.subtitle, ...partial } }
    })),

  updateAudio: (partial) =>
    set((state) => ({
      settings: { ...state.settings, audio: { ...state.settings.audio, ...partial } }
    })),

  loadSettings: (settings) => set({ settings })
}))
