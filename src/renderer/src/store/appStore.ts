import { create } from 'zustand'
import type { InputMode, AppStatus } from '@shared/types'

interface AppState {
  mode: InputMode
  status: AppStatus
  isPaused: boolean
  showFloating: boolean
  setMode: (mode: InputMode) => void
  setStatus: (status: AppStatus) => void
  startTranslation: () => void
  stopTranslation: () => void
  pauseTranslation: () => void
  resumeTranslation: () => void
  setShowFloating: (show: boolean) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'url',
  status: 'idle',
  isPaused: false,
  showFloating: false,

  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),

  startTranslation: () => set({ status: 'connecting', isPaused: false, showFloating: true }),
  stopTranslation: () => set({ status: 'idle', isPaused: false, showFloating: false }),
  pauseTranslation: () => set((state) => ({ isPaused: true, status: state.status })),
  resumeTranslation: () => set((state) => ({ isPaused: false, status: 'listening' })),

  setShowFloating: (show) => set({ showFloating: show }),

  reset: () => set({ mode: 'url', status: 'idle', isPaused: false, showFloating: false })
}))
