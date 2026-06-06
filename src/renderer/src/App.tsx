import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/Layout/AppLayout'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { useSettingsStore } from './store/settingsStore'
import { useHistoryStore } from './store/historyStore'
import { useSubtitleStore } from './store/subtitleStore'
import { useAppStore } from './store/appStore'

export default function App() {
  const init = useSettingsStore((s) => s.init)
  const loadHistory = useHistoryStore((s) => s.loadHistory)
  const saveSession = useHistoryStore((s) => s.saveSession)

  useEffect(() => {
    init()
    loadHistory()
  }, [init, loadHistory])

  // Save current session when status changes to 'idle' (translation complete or stopped)
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      // When status transitions to 'idle' from a working state, save the session
      if (state.status === 'idle' && prevState.status !== 'idle') {
        const entries = useSubtitleStore.getState().entries
        if (entries.length > 0) {
          const mode = entries[0].mode || 'url'
          saveSession(entries, mode)
        }
      }
    })
    return unsubscribe
  }, [saveSession])

  return (
    <HashRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppLayout>
    </HashRouter>
  )
}
