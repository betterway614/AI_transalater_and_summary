import { Box, Paper, Typography } from '@mui/material'
import { useRef, useEffect } from 'react'
import { useSubtitleStore } from '../../store/subtitleStore'
import { useSettingsStore } from '../../store/settingsStore'
import SubtitleLine from './SubtitleLine'

export default function SubtitlePanel() {
  const entries = useSubtitleStore((s) => s.entries)
  const fontSize = useSettingsStore((s) => s.settings.subtitle.fontSize)
  const maxLines = useSettingsStore((s) => s.settings.subtitle.maxLines)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  const displayEntries = entries.slice(-maxLines)

  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          字幕
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {entries.length} 条
        </Typography>
      </Box>

      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {displayEntries.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: 200
            }}
          >
            <Typography color="text.disabled">开始翻译后，字幕将在此显示</Typography>
          </Box>
        ) : (
          displayEntries.map((entry) => <SubtitleLine key={entry.id} entry={entry} fontSize={fontSize} />)
        )}
      </Box>
    </Paper>
  )
}
