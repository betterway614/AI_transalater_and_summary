import { create } from 'zustand'
import type { SubtitleEntry, InputMode } from '@shared/types'

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
let orderCounter = 0

function generateId(): string {
  return `sub_${Date.now()}_${++idCounter}`
}

function nextOrder(): number {
  return ++orderCounter
}

export const useSubtitleStore = create<SubtitleState>((set) => ({
  entries: [],

  addEntry: (entry) =>
    set((state) => {
      // Insert at correct position by order, maintaining sort
      const pos = state.entries.findIndex((e) => (e as any)._order > (entry as any)._order)
      const entries = pos === -1
        ? [...state.entries, entry]
        : [...state.entries.slice(0, pos), entry, ...state.entries.slice(pos)]
      return { entries }
    }),

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
    orderCounter = 0
    set({ entries: [] })
  },

  createEntry: (originalText, mode) => ({
    id: generateId(),
    timestamp: Date.now(),
    originalText,
    translatedText: '',
    isFinal: false,
    mode,
    _order: nextOrder()
  } as SubtitleEntry & { _order: number })
}))
