import { Box, FormControl, InputLabel, Select, MenuItem, Button, Paper, Typography } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { useSettingsStore } from '../../store/settingsStore'
import { WHISPER_LANGUAGES } from '@shared/constants'

interface DeviceSelectorProps {
  onStart: () => void
  onStop: () => void
}

export default function DeviceSelector({ onStart, onStop }: DeviceSelectorProps) {
  const mode = useAppStore((s) => s.mode)
  const status = useAppStore((s) => s.status)
  const settings = useSettingsStore((s) => s.settings)
  const updateAudio = useSettingsStore((s) => s.updateAudio)
  const updateAI = useSettingsStore((s) => s.updateAI)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  const isRunning = status !== 'idle' && status !== 'error'

  // Enumerate audio input devices
  useEffect(() => {
    if (mode !== 'microphone') return

    const fetchDevices = () => {
      navigator.mediaDevices
        .enumerateDevices()
        .then((all) => setDevices(all.filter((d) => d.kind === 'audioinput')))
        .catch(() => {})
    }

    fetchDevices()
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', fetchDevices)
  }, [mode])

  const handleToggle = () => {
    if (isRunning) {
      onStop()
    } else {
      onStart()
    }
  }

  const handleDeviceChange = (deviceId: string) => {
    updateAudio({ inputDevice: deviceId })
  }

  const handleSourceLangChange = (code: string) => {
    updateAI({ whisper: { ...settings.ai.whisper, language: code } })
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.2s ease, border-color 0.2s ease'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {mode === 'microphone' && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>麦克风</InputLabel>
            <Select
              label="麦克风"
              value={settings.audio.inputDevice}
              onChange={(e) => handleDeviceChange(e.target.value)}
              disabled={isRunning}
            >
              <MenuItem value="default">默认麦克风</MenuItem>
              {devices.map((d) => (
                <MenuItem key={d.deviceId} value={d.deviceId}>
                  {d.label || `麦克风 ${d.deviceId.slice(0, 8)}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {mode === 'system-audio' && (
          <Typography variant="body2" color="text.secondary">
            将捕获系统播放的所有音频
          </Typography>
        )}

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>源语言</InputLabel>
          <Select
            label="源语言"
            value={settings.ai.whisper.language || 'auto'}
            onChange={(e) => handleSourceLangChange(e.target.value)}
            disabled={isRunning}
          >
            {WHISPER_LANGUAGES.map((l) => (
              <MenuItem key={l.code} value={l.code}>
                {l.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography color="text.secondary">→</Typography>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>目标语言</InputLabel>
          <Select label="目标语言" value="zh" disabled>
            {WHISPER_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
              <MenuItem key={l.code} value={l.code}>
                {l.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="contained"
          onClick={handleToggle}
          startIcon={isRunning ? <StopIcon /> : <PlayArrowIcon />}
          color={isRunning ? 'error' : 'primary'}
          sx={{ minWidth: 100, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, transition: 'all 0.15s ease', '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 } }}
        >
          {isRunning ? '停止' : '开始'}
        </Button>
      </Box>
    </Paper>
  )
}
