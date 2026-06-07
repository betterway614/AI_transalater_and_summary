import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'
import AppLayout from './components/Layout/AppLayout'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { useSettingsStore } from './store/settingsStore'
import { useHistoryStore } from './store/historyStore'
import { useSubtitleStore } from './store/subtitleStore'
import { useAppStore } from './store/appStore'
import { useSummaryStore } from './store/summaryStore'
import { useSnapshotStore } from './store/snapshotStore'
import type { SubtitleEntry, InputMode } from '@shared/types'

export default function App() {
  const init = useSettingsStore((s) => s.init)
  const loadHistory = useHistoryStore((s) => s.loadHistory)
  const saveSession = useHistoryStore((s) => s.saveSession)
  const loadSummary = useSummaryStore((s) => s.loadSummary)

  const [recoverDialog, setRecoverDialog] = useState<{
    entries: SubtitleEntry[]
    summary: string | null
    mode: InputMode
  } | null>(null)

  useEffect(() => {
    init()
    loadHistory()
    loadSummary()

    // Check for crash recovery snapshot
    useSnapshotStore.getState().loadSnapshot().then((snapshot) => {
      if (snapshot) {
        setRecoverDialog({
          entries: snapshot.entries,
          summary: snapshot.summary,
          mode: snapshot.mode
        })
      }
    })
  }, [init, loadHistory, loadSummary])

  // Start/stop snapshot interval based on translation status
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state) => {
      if (state.status !== 'idle' && state.status !== 'error') {
        useSnapshotStore.getState().startSnapshot()
      } else {
        useSnapshotStore.getState().stopSnapshot()
      }
    })
    return unsubscribe
  }, [])

  // Save current session when status changes to 'idle' (translation complete or stopped)
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (state.status === 'idle' && prevState.status !== 'idle') {
        const entries = useSubtitleStore.getState().entries
        if (entries.length > 0) {
          const mode = entries[0].mode || 'url'
          const summary = useSummaryStore.getState().summary
          saveSession(entries, mode, summary)
          // Clear snapshot after successful save
          useSnapshotStore.getState().clearSnapshot()
        }
      }
    })
    return unsubscribe
  }, [saveSession])

  const handleRecover = () => {
    if (!recoverDialog) return
    const { entries, summary, mode } = recoverDialog
    const store = useSubtitleStore.getState()
    store.clearEntries()
    entries.forEach((e) => store.addEntry(e))
    if (summary) useSummaryStore.getState().setSummary(summary)
    useAppStore.getState().setMode(mode)
    useSnapshotStore.getState().clearSnapshot()
    setRecoverDialog(null)
  }

  const handleDiscard = () => {
    useSnapshotStore.getState().clearSnapshot()
    setRecoverDialog(null)
  }

  return (
    <HashRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppLayout>
      <Dialog open={!!recoverDialog} onClose={handleDiscard}>
        <DialogTitle>恢复上次会话？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            检测到上次翻译会话未正常保存（共 {recoverDialog?.entries.length || 0} 条记录）。
            是否恢复？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDiscard}>丢弃</Button>
          <Button onClick={handleRecover} variant="contained">恢复</Button>
        </DialogActions>
      </Dialog>
    </HashRouter>
  )
}
