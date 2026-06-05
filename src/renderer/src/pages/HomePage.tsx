import { Box } from '@mui/material'
import { useCallback, useRef } from 'react'
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

export default function HomePage() {
  const mode = useAppStore((s) => s.mode)
  const status = useAppStore((s) => s.status)
  const showFloating = useAppStore((s) => s.showFloating)
  const startTranslation = useAppStore((s) => s.startTranslation)
  const stopTranslation = useAppStore((s) => s.stopTranslation)
  const { processAudioChunk } = useSubtitle()

  const handleAudioChunk = useCallback(
    (blob: Blob) => {
      processAudioChunk(blob, mode)
    },
    [processAudioChunk, mode]
  )

  const { start: startCapture, stop: stopCapture, isCapturing } = useAudioCapture({
    onAudioChunk: handleAudioChunk
  })

  const handleStart = useCallback(async () => {
    startTranslation()
    try {
      await startCapture()
    } catch (err) {
      console.error('Failed to start audio capture:', err)
      stopTranslation()
    }
  }, [startTranslation, startCapture, stopTranslation])

  const handleStop = useCallback(() => {
    stopCapture()
    stopTranslation()
  }, [stopCapture, stopTranslation])

  // Expose start/stop to child components via a ref-based callback pattern
  const controlRef = useRef({ handleStart, handleStop })
  controlRef.current = { handleStart, handleStop }

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
      <ControlBar onStart={handleStart} onStop={handleStop} />
      {showFloating && <FloatingSubtitle />}
    </Box>
  )
}
