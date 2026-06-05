import { create } from 'zustand'
import type { InputMode, AppStatus } from '@shared/types'

interface AppState {
  mode: InputMode
  status: AppStatus
  setMode: (mode: InputMode) => void
  setStatus: (status: AppStatus) => void
  startTranslation: () => void
  stopTranslation: () => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'url',
  status: 'idle',

  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),

  startTranslation: () => set({ status: 'connecting' }),
  stopTranslation: () => set({ status: 'idle' }),

  reset: () => set({ mode: 'url', status: 'idle' })
}))
