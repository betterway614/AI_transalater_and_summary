import { TextField, Button, Paper } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { useURLAudio } from '../../hooks/useURLAudio'

export default function URLInputPanel() {
  const [url, setUrl] = useState('')
  const status = useAppStore((s) => s.status)
  const mode = useAppStore((s) => s.mode)
  const stopTranslation = useAppStore((s) => s.stopTranslation)
  const { start, stop } = useURLAudio()

  const isRunning = status !== 'idle' && status !== 'error'

  const handleToggle = () => {
    if (isRunning) {
      stop()
      stopTranslation()
    } else {
      if (!url.trim()) return
      start(url.trim(), mode)
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder="请输入视频 URL（YouTube、B站等）..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isRunning}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 1.5
          }
        }}
      />
      <Button
        variant="contained"
        onClick={handleToggle}
        startIcon={isRunning ? <StopIcon /> : <PlayArrowIcon />}
        color={isRunning ? 'error' : 'primary'}
        sx={{
          minWidth: 100,
          borderRadius: 1.5,
          textTransform: 'none',
          fontWeight: 600
        }}
      >
        {isRunning ? '停止' : '开始'}
      </Button>
    </Paper>
  )
}
