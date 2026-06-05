import { Box, FormControl, InputLabel, Select, MenuItem, Button, Paper, Typography } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import { useAppStore } from '../../store/appStore'

const mockDevices = [
  { id: 'default', name: '默认麦克风' },
  { id: 'mic-1', name: '内置麦克风' },
  { id: 'mic-2', name: 'USB 麦克风' }
]

const languages = [
  { code: 'en', name: '英文' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日文' },
  { code: 'ko', name: '韩文' }
]

export default function DeviceSelector() {
  const mode = useAppStore((s) => s.mode)
  const status = useAppStore((s) => s.status)
  const startTranslation = useAppStore((s) => s.startTranslation)
  const stopTranslation = useAppStore((s) => s.stopTranslation)

  const isRunning = status !== 'idle' && status !== 'error'

  const handleToggle = () => {
    if (isRunning) {
      stopTranslation()
    } else {
      startTranslation()
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {mode === 'microphone' && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>麦克风</InputLabel>
            <Select label="麦克风" defaultValue="default">
              {mockDevices.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
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
          <Select label="源语言" defaultValue="en">
            {languages.map((l) => (
              <MenuItem key={l.code} value={l.code}>
                {l.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography color="text.secondary">→</Typography>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>目标语言</InputLabel>
          <Select label="目标语言" defaultValue="zh">
            {languages.map((l) => (
              <MenuItem key={l.code} value={l.code}>
                {l.name}
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
          sx={{
            minWidth: 100,
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          {isRunning ? '停止' : '开始'}
        </Button>
      </Box>
    </Paper>
  )
}
