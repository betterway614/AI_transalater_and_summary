import { Box, Typography } from '@mui/material'
import type { SubtitleEntry } from '@shared/types'

interface SubtitleLineProps {
  entry: SubtitleEntry
  fontSize?: number
}

export default function SubtitleLine({ entry, fontSize = 16 }: SubtitleLineProps) {
  return (
    <Box
      sx={{
        py: 1,
        px: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        opacity: entry.isFinal ? 1 : 0.7,
        transition: 'background-color 0.15s ease',
        cursor: 'default',
        '&:hover': {
          bgcolor: 'var(--hover-glow)'
        }
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontSize,
          color: 'text.secondary',
          lineHeight: 1.6,
          fontStyle: entry.isFinal ? 'normal' : 'italic',
          transition: 'color 0.2s ease'
        }}
      >
        {entry.originalText}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          fontSize: fontSize + 2,
          color: 'secondary.main',
          fontWeight: 500,
          lineHeight: 1.6,
          transition: 'color 0.2s ease'
        }}
      >
        {entry.translatedText || '...'}
      </Typography>
      {entry.correctedFrom && (
        <Typography variant="caption" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>
          {entry.correctedFrom}
        </Typography>
      )}
    </Box>
  )
}
