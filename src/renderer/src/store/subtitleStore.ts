import { create } from 'zustand'
import type { SubtitleEntry, InputMode } from '@shared/types'
import { useHistoryStore } from './historyStore'

interface SubtitleState {
  entries: SubtitleEntry[]
  addEntry: (entry: SubtitleEntry) => void
  updateEntry: (id: string, text: string) => void
  replaceLastEntry: (entry: SubtitleEntry) => void
  markFinal: (id: string, translatedText: string) => void
  clearEntries: () => void
  createEntry: (originalText: string, mode: InputMode) => SubtitleEntry
}

let idCounter = 0

function generateId(): string {
  return `sub_${Date.now()}_${++idCounter}`
}

export const useSubtitleStore = create<SubtitleState>((set) => ({
  entries: [],

  addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),

  updateEntry: (id, text) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, translatedText: text } : e))
    })),

  replaceLastEntry: (entry) =>
    set((state) => {
      const entries = [...state.entries]
      if (entries.length > 0 && !entries[entries.length - 1].isFinal) {
        entries[entries.length - 1] = entry
      } else {
        entries.push(entry)
      }
      return { entries }
    }),

  markFinal: (id, translatedText) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, isFinal: true, translatedText } : e
      )
    })),

  clearEntries: () => {
    // Save current entries as a history session before clearing
    const currentEntries = useSubtitleStore.getState().entries
    if (currentEntries.length > 0) {
      const mode = currentEntries[0].mode || 'url'
      useHistoryStore.getState().saveSession(currentEntries, mode)
    }
    set({ entries: [] })
  },

  createEntry: (originalText, mode) => ({
    id: generateId(),
    timestamp: Date.now(),
    originalText,
    translatedText: '',
    isFinal: false,
    mode
  })
}))
