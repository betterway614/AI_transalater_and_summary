import { Box, Typography, IconButton, Slider, Tooltip, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { useRef, useEffect, useState } from 'react'
import { useSubtitleStore } from '../../store/subtitleStore'
import SubtitleLine from './SubtitleLine'

export default function FloatingSubtitle() {
  const entries = useSubtitleStore((s) => s.entries)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [opacity, setOpacity] = useState(0.9)
  const [visible, setVisible] = useState(true)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  const recentEntries = entries.slice(-5)

  if (!visible) return null

  const bgAlpha = isDark ? opacity * 0.85 : opacity * 0.92
  const bgBase = isDark ? '10, 14, 26' : '255, 255, 255'
  const textPrimary = isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)'
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const mutedColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'
  const accentColor = isDark ? '#ffd54f' : '#e6a100'

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        maxWidth: 800,
        bgcolor: `rgba(${bgBase}, ${bgAlpha})`,
        borderRadius: 2,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
        zIndex: 'var(--z-floating)',
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)'
          : '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          py: 0.25,
          cursor: 'move',
          borderBottom: `1px solid ${borderColor}`
        }}
      >
        <DragIndicatorIcon sx={{ color: mutedColor, fontSize: 16 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Slider
            value={opacity}
            onChange={(_, v) => setOpacity(v as number)}
            min={0.3}
            max={1}
            step={0.05}
            size="small"
            aria-label="调整透明度"
            sx={{ width: 60, color: mutedColor }}
          />
          <IconButton
            size="small"
            onClick={() => setVisible(false)}
            aria-label="关闭浮动字幕"
            sx={{
              color: mutedColor,
              '&:hover': { color: textPrimary }
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Subtitle content */}
      <Box ref={scrollRef} sx={{ maxHeight: 200, overflowY: 'auto', px: 1.5, pb: 1 }}>
        {recentEntries.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ textAlign: 'center', py: 2, color: mutedColor }}
          >
            等待翻译…
          </Typography>
        ) : (
          recentEntries.map((entry) => (
            <Box key={entry.id} sx={{ py: 0.5 }}>
              <Typography variant="body2" sx={{ color: textSecondary, fontSize: 13, lineHeight: 1.4 }}>
                {entry.originalText}
              </Typography>
              <Typography variant="body2" sx={{ color: accentColor, fontSize: 15, fontWeight: 500, lineHeight: 1.4 }}>
                {entry.translatedText || '…'}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Box>
  )
}
