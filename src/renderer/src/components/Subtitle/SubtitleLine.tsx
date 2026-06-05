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
        opacity: entry.isFinal ? 1 : 0.7
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontSize,
          color: 'text.secondary',
          lineHeight: 1.6,
          fontStyle: entry.isFinal ? 'normal' : 'italic'
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
          lineHeight: 1.6
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
