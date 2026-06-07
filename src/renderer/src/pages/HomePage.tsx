import { Box } from '@mui/material'
import { useCallback, useEffect } from 'react'
import ModeTabs from '../components/ModeSelector/ModeTabs'
import URLInputPanel from '../components/URLInput/URLInputPanel'
import DeviceSelector from '../components/DeviceSelector/DeviceSelector'
import SubtitlePanel from '../components/Subtitle/SubtitlePanel'
import ControlBar from '../components/Common/ControlBar'
import SummaryPanel from '../components/Summary/SummaryPanel'
import { useAppStore } from '../store/appStore'
import { useSubtitleStore } from '../store/subtitleStore'
import { useSummaryStore } from '../store/summaryStore'
import { useSettingsStore } from '../store/settingsStore'
import { useSubtitle } from '../hooks/useSubtitle'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useSystemAudioCapture } from '../hooks/useSystemAudio'
import { useURLAudio } from '../hooks/useURLAudio'

const log = (...args: unknown[]) => { console.log(...args); window.api?.logToMain('info', ...args) }

export default function HomePage() {
  const mode = useAppStore((s) => s.mode)
  const setShowFloating = useAppStore((s) => s.setShowFloating)
  const startTranslation = useAppStore((s) => s.startTranslation)
  const stopTranslation = useAppStore((s) => s.stopTranslation)
  const { processAudioChunk } = useSubtitle()

  // Sync subtitles to floating window via IPC
  const entries = useSubtitleStore((s) => s.entries)
  useEffect(() => {
    if (entries.length > 0) {
      window.api?.floating.updateSubtitles(entries)
    }
  }, [entries])

  // Sync theme to floating window
  const theme = useSettingsStore((s) => s.settings.general.theme)
  useEffect(() => {
    window.api?.floating.updateTheme(theme)
  }, [theme])

  // Sync summary to floating window
  const summary = useSummaryStore((s) => s.summary)
  useEffect(() => {
    window.api?.floating.updateSummary(summary)
  }, [summary])

  // Microphone capture
  const handleAudioChunk = useCallback(
    (blob: Blob) => {
      console.log(`[HomePage] handleAudioChunk: ${blob.size} bytes, mode=${mode}`)
      processAudioChunk(blob, mode)
    },
    [processAudioChunk, mode]
  )
  const { start: startMicCapture, stop: stopMicCapture, audioLevelRef } = useAudioCapture({
    onAudioChunk: handleAudioChunk
  })

  // System audio capture (via Electron desktopCapturer)
  const { start: startSystemAudio, stop: stopSystemAudio, audioLevelRef: sysAudioLevelRef } = useSystemAudioCapture({
    onAudioChunk: handleAudioChunk
  })

  const activeAudioLevel = mode === 'system-audio' ? sysAudioLevelRef : audioLevelRef
  const { start: startUrlAudio, stop: stopUrlAudio, getProgress: getUrlProgress } = useURLAudio()

  const clearEntries = useSubtitleStore((s) => s.clearEntries)

  const handleStart = useCallback(async () => {
    log(`[HomePage] handleStart called, mode=${mode}`)
    clearEntries() // Clear previous entries before starting new capture
    useSummaryStore.getState().reset() // Clear previous summary
    startTranslation()
    try {
      if (mode === 'system-audio') {
        await startSystemAudio()
      } else {
        await startMicCapture()
      }
      // Show floating window ONLY after audio capture succeeds (so focus isn't stolen)
      setShowFloating(true)
    } catch (err) {
      console.error('Failed to start audio capture:', err)
      stopTranslation()
    }
  }, [mode, clearEntries, startTranslation, startMicCapture, startSystemAudio, stopTranslation, setShowFloating])

  const handleStop = useCallback(() => {
    if (mode === 'url') {
      stopUrlAudio()
    } else if (mode === 'system-audio') {
      stopSystemAudio()
    } else {
      stopMicCapture()
    }
    stopTranslation()
  }, [mode, stopMicCapture, stopSystemAudio, stopUrlAudio, stopTranslation])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, gap: 2 }}>
      <ModeTabs />
      {mode === 'url' ? (
        <URLInputPanel
          onStartUrl={startUrlAudio}
          onStopUrl={stopUrlAudio}
          getDownloadProgress={getUrlProgress}
        />
      ) : (
        <DeviceSelector onStart={handleStart} onStop={handleStop} />
      )}
      <SubtitlePanel />
      <SummaryPanel />
      <ControlBar onStop={handleStop} audioLevelRef={activeAudioLevel} />
    </Box>
  )
}
