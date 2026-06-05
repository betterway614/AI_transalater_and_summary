import { Box } from '@mui/material'
import { useCallback } from 'react'
import ModeTabs from '../components/ModeSelector/ModeTabs'
import URLInputPanel from '../components/URLInput/URLInputPanel'
import DeviceSelector from '../components/DeviceSelector/DeviceSelector'
import SubtitlePanel from '../components/Subtitle/SubtitlePanel'
import FloatingSubtitle from '../components/Subtitle/FloatingSubtitle'
import ControlBar from '../components/Common/ControlBar'
import SummaryPanel from '../components/Summary/SummaryPanel'
import { useAppStore } from '../store/appStore'
import { useSubtitle } from '../hooks/useSubtitle'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useSystemAudio } from '../hooks/useSystemAudio'

export default function HomePage() {
  const mode = useAppStore((s) => s.mode)
  const showFloating = useAppStore((s) => s.showFloating)
  const startTranslation = useAppStore((s) => s.startTranslation)
  const stopTranslation = useAppStore((s) => s.stopTranslation)
  const { processAudioChunk } = useSubtitle()

  // Microphone capture
  const handleAudioChunk = useCallback(
    (blob: Blob) => { processAudioChunk(blob, mode) },
    [processAudioChunk, mode]
  )
  const { start: startMicCapture, stop: stopMicCapture } = useAudioCapture({
    onAudioChunk: handleAudioChunk
  })

  // System audio capture
  const { start: startSystemAudio, stop: stopSystemAudio } = useSystemAudio()

  const handleStart = useCallback(async () => {
    startTranslation()
    try {
      if (mode === 'system-audio') {
        await startSystemAudio()
      } else {
        await startMicCapture()
      }
    } catch (err) {
      console.error('Failed to start audio capture:', err)
      stopTranslation()
    }
  }, [mode, startTranslation, startMicCapture, startSystemAudio, stopTranslation])

  const handleStop = useCallback(() => {
    if (mode === 'system-audio') {
      stopSystemAudio()
    } else {
      stopMicCapture()
    }
    stopTranslation()
  }, [mode, stopMicCapture, stopSystemAudio, stopTranslation])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, gap: 2 }}>
      <ModeTabs />
      {mode === 'url' ? (
        <URLInputPanel />
      ) : (
        <DeviceSelector onStart={handleStart} onStop={handleStop} />
      )}
      <SubtitlePanel />
      <SummaryPanel />
      <ControlBar onStop={handleStop} />
      {showFloating && <FloatingSubtitle />}
    </Box>
  )
}
