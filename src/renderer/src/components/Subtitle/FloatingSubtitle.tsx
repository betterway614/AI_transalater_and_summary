import { Box, Typography, IconButton, Slider, Tooltip } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { useRef, useEffect, useState } from 'react'
import { useSubtitleStore } from '../../store/subtitleStore'
import SubtitleLine from './SubtitleLine'

export default function FloatingSubtitle() {
  const entries = useSubtitleStore((s) => s.entries)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [opacity, setOpacity] = useState(0.85)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  const recentEntries = entries.slice(-5)

  if (!visible) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        maxWidth: 800,
        bgcolor: 'rgba(0, 0, 0, ' + opacity + ')',
        borderRadius: 2,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        zIndex: 9999
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          py: 0.5,
          cursor: 'move'
        }}
      >
        <DragIndicatorIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Slider
            value={opacity}
            onChange={(_, v) => setOpacity(v as number)}
            min={0.3}
            max={1}
            step={0.05}
            size="small"
            sx={{ width: 60, color: 'rgba(255,255,255,0.5)' }}
          />
          <IconButton size="small" onClick={() => setVisible(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Subtitle content */}
      <Box ref={scrollRef} sx={{ maxHeight: 200, overflowY: 'auto', px: 1 }}>
        {recentEntries.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ textAlign: 'center', py: 2, color: 'rgba(255,255,255,0.4)' }}
          >
            等待翻译...
          </Typography>
        ) : (
          recentEntries.map((entry) => (
            <Box key={entry.id} sx={{ py: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.4 }}>
                {entry.originalText}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffd54f', fontSize: 15, fontWeight: 500, lineHeight: 1.4 }}>
                {entry.translatedText || '...'}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Box>
  )
}
