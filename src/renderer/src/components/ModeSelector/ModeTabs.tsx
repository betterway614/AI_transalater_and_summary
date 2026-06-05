import { Tabs, Tab, Paper } from '@mui/material'
import LinkIcon from '@mui/icons-material/Link'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import MicIcon from '@mui/icons-material/Mic'
import { useAppStore } from '../../store/appStore'
import type { InputMode } from '@shared/types'

const modes: { value: InputMode; label: string; icon: React.ReactElement }[] = [
  { value: 'url', label: 'URL 视频', icon: <LinkIcon fontSize="small" /> },
  { value: 'system-audio', label: '系统音频', icon: <VolumeUpIcon fontSize="small" /> },
  { value: 'microphone', label: '麦克风', icon: <MicIcon fontSize="small" /> }
]

export default function ModeTabs() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)

  const currentIdx = modes.findIndex((m) => m.value === mode)

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Tabs
        value={currentIdx}
        onChange={(_, idx) => setMode(modes[idx].value)}
        variant="fullWidth"
        sx={{
          minHeight: 44,
          '& .MuiTab-root': {
            minHeight: 44,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 14
          }
        }}
      >
        {modes.map((m) => (
          <Tab key={m.value} icon={m.icon} label={m.label} iconPosition="start" />
        ))}
      </Tabs>
    </Paper>
  )
}
