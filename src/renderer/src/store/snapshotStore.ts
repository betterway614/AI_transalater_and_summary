import { create } from 'zustand'
import type { SubtitleEntry, InputMode } from '@shared/types'

interface Snapshot {
  entries: SubtitleEntry[]
  summary: string | null
  mode: InputMode
  timestamp: number
}

interface SnapshotState {
  snapshot: Snapshot | null
  snapshotIntervalId: ReturnType<typeof setInterval> | null
  startSnapshot: () => void
  stopSnapshot: () => void
  clearSnapshot: () => void
  loadSnapshot: () => Promise<Snapshot | null>
}

const STORAGE_KEY = 'session.snapshot'
const INTERVAL_MS = 30_000

async function writeSnapshot(snapshot: Snapshot) {
  try {
    await window.api?.store?.set(STORAGE_KEY, snapshot)
  } catch (err) {
    console.error('[Snapshot] Write failed:', err)
  }
}

export const useSnapshotStore = create<SnapshotState>((set, get) => ({
  snapshot: null,
  snapshotIntervalId: null,

  startSnapshot: () => {
    const existing = get().snapshotIntervalId
    if (existing) clearInterval(existing)

    const id = setInterval(async () => {
      const { useSubtitleStore } = await import('./subtitleStore')
      const { useSummaryStore } = await import('./summaryStore')
      const entries = useSubtitleStore.getState().entries
      if (entries.length === 0) return

      const summary = useSummaryStore.getState().summary
      const mode = entries[0].mode || 'url'
      const snapshot: Snapshot = { entries: entries.map(e => ({ ...e })), summary, mode, timestamp: Date.now() }
      set({ snapshot })
      await writeSnapshot(snapshot)
    }, INTERVAL_MS)

    set({ snapshotIntervalId: id })
  },

  stopSnapshot: () => {
    const id = get().snapshotIntervalId
    if (id) clearInterval(id)
    set({ snapshotIntervalId: null })
  },

  clearSnapshot: async () => {
    set({ snapshot: null })
    try {
      await window.api?.store?.set(STORAGE_KEY, null)
    } catch (err) {
      console.error('[Snapshot] Clear failed:', err)
    }
  },

  loadSnapshot: async () => {
    try {
      const saved = (await window.api?.store?.get(STORAGE_KEY)) as Snapshot | null
      if (saved && saved.entries && saved.entries.length > 0 && saved.timestamp) {
        set({ snapshot: saved })
        return saved
      }
    } catch (err) {
      console.error('[Snapshot] Load failed:', err)
    }
    return null
  }
}))
