import { create } from 'zustand'
import type { SubtitleEntry, InputMode } from '@shared/types'
import { useSnapshotStore } from './snapshotStore'

export interface HistorySession {
  id: string
  mode: InputMode
  startTime: number
  endTime: number
  entries: SubtitleEntry[]
  summary: string | null
}

interface HistoryState {
  sessions: HistorySession[]
  loadHistory: () => Promise<void>
  saveSession: (entries: SubtitleEntry[], mode: InputMode, summary?: string | null) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
}

const STORAGE_KEY = 'history.sessions'
const MAX_SESSIONS = 100

export const useHistoryStore = create<HistoryState>((set, get) => ({
  sessions: [],

  loadHistory: async () => {
    try {
      const saved = await window.api?.store?.get(STORAGE_KEY)
      if (Array.isArray(saved)) {
        set({ sessions: saved })
        console.log(`[History] Loaded ${saved.length} sessions`)
      }
    } catch (err) {
      console.error('[History] Failed to load:', err)
    }
  },

  saveSession: async (entries: SubtitleEntry[], mode: InputMode, summary?: string | null) => {
    if (entries.length === 0) return

    const session: HistorySession = {
      id: `session_${Date.now()}`,
      mode,
      startTime: entries[0].timestamp,
      endTime: entries[entries.length - 1].timestamp,
      entries: entries.map(e => ({ ...e })), // deep copy
      summary: summary || null
    }

    const sessions = [session, ...get().sessions].slice(0, MAX_SESSIONS)
    set({ sessions })

    try {
      await window.api?.store?.set(STORAGE_KEY, sessions)
      useSnapshotStore.getState().clearSnapshot()
      console.log(`[History] Saved session with ${entries.length} entries, total: ${sessions.length}`)
    } catch (err) {
      console.error('[History] Failed to save:', err)
    }
  },

  deleteSession: async (id: string) => {
    const sessions = get().sessions.filter(s => s.id !== id)
    set({ sessions })
    try {
      await window.api?.store?.set(STORAGE_KEY, sessions)
    } catch (err) {
      console.error('[History] Failed to delete:', err)
    }
  },

  clearHistory: async () => {
    set({ sessions: [] })
    try {
      await window.api?.store?.set(STORAGE_KEY, [])
    } catch (err) {
      console.error('[History] Failed to clear:', err)
    }
  }
}))
