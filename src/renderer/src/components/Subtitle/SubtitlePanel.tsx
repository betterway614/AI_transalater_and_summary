import { Box, Paper, Typography } from '@mui/material'
import SubtitlesIcon from '@mui/icons-material/Subtitles'
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
        overflow: 'hidden',
        transition: 'background-color 0.2s ease, border-color 0.2s ease'
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
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          字幕
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {entries.length} 条
        </Typography>
      </Box>

      <Box
        ref={scrollRef}
        sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
        role="log"
        aria-live="polite"
        aria-label="实时字幕"
      >
        {displayEntries.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: 200,
              gap: 1
            }}
          >
            <SubtitlesIcon sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.4 }} />
            <Typography color="text.disabled" variant="body2">
              开始翻译后，字幕将在此显示
            </Typography>
          </Box>
        ) : (
          displayEntries.map((entry) => <SubtitleLine key={entry.id} entry={entry} fontSize={fontSize} />)
        )}
      </Box>
    </Paper>
  )
}
