import { Box } from '@mui/material'
import { useCallback } from 'react'
import ModeTabs from '../components/ModeSelector/ModeTabs'
import URLInputPanel from '../components/URLInput/URLInputPanel'
import DeviceSelector from '../components/DeviceSelector/DeviceSelector'
import SubtitlePanel from '../components/Subtitle/SubtitlePanel'
import ControlBar from '../components/Common/ControlBar'
import SummaryPanel from '../components/Summary/SummaryPanel'
import { useAppStore } from '../store/appStore'
import { useSubtitle } from '../hooks/useSubtitle'
import { useAudioCapture } from '../hooks/useAudioCapture'

export default function HomePage() {
  const mode = useAppStore((s) => s.mode)
  const status = useAppStore((s) => s.status)
  const { processAudioChunk } = useSubtitle()

  const handleAudioChunk = useCallback(
    (blob: Blob) => {
      processAudioChunk(blob, mode)
    },
    [processAudioChunk, mode]
  )

  const { start: startCapture, stop: stopCapture } = useAudioCapture({
    onAudioChunk: handleAudioChunk
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, gap: 2 }}>
      <ModeTabs />
      {mode === 'url' ? (
        <URLInputPanel />
      ) : (
        <DeviceSelector />
      )}
      <SubtitlePanel />
      <SummaryPanel />
      <ControlBar />
    </Box>
  )
}
