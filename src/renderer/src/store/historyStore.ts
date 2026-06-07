import { create } from 'zustand'
import type { SubtitleEntry, InputMode } from '@shared/types'
import { useSnapshotStore } from './snapshotStore'
import { extractKeywords } from '../utils/markdown-exporter'

export interface HistorySession {
  id: string
  mode: InputMode
  startTime: number
  endTime: number
  entries: SubtitleEntry[]
  summary: string | null
  keywords: string[]
}

interface HistoryState {
  sessions: HistorySession[]
  loadHistory: () => Promise<void>
  saveSession: (entries: SubtitleEntry[], mode: InputMode, summary?: string | null) => Promise<void>
  updateLatestSummary: (summary: string) => Promise<void>
  updateSessionSummary: (id: string, summary: string) => Promise<void>
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
        // Backward compat: ensure all sessions have keywords field
        const sessions = saved.map((s: any) => ({
          ...s,
          keywords: Array.isArray(s.keywords) ? s.keywords : (s.summary ? extractKeywords(s.summary) : [])
        }))
        set({ sessions })
        console.log(`[History] Loaded ${sessions.length} sessions`)
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
      summary: summary || null,
      keywords: summary ? extractKeywords(summary) : []
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

  updateLatestSummary: async (summary: string) => {
    const sessions = get().sessions
    if (sessions.length === 0) return

    const keywords = extractKeywords(summary)
    const updated = [...sessions]
    updated[0] = { ...updated[0], summary, keywords }
    set({ sessions: updated })

    try {
      await window.api?.store?.set(STORAGE_KEY, updated)
      console.log(`[History] Updated summary for latest session ${updated[0].id}`)
    } catch (err) {
      console.error('[History] Failed to update summary:', err)
    }
  },

  updateSessionSummary: async (id: string, summary: string) => {
    const sessions = get().sessions
    const idx = sessions.findIndex(s => s.id === id)
    if (idx === -1) return

    const keywords = extractKeywords(summary)
    const updated = [...sessions]
    updated[idx] = { ...updated[idx], summary, keywords }
    set({ sessions: updated })

    try {
      await window.api?.store?.set(STORAGE_KEY, updated)
      console.log(`[History] Updated summary for session ${id}`)
    } catch (err) {
      console.error('[History] Failed to update session summary:', err)
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
