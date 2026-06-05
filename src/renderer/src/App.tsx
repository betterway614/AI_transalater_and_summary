import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/Layout/AppLayout'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { useSettingsStore } from './store/settingsStore'

export default function App() {
  const init = useSettingsStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

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
