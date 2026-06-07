import { Box, Typography, IconButton, Slider } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import SubtitlesIcon from '@mui/icons-material/Subtitles'
import OpenWithIcon from '@mui/icons-material/OpenWith'
import { useEffect, useState, useRef, useCallback } from 'react'
import type { SubtitleEntry, SubtitleDisplayMode } from '@shared/types'

const MAX_ENTRIES = 8
const EXPAND_DELAY = 200

interface Props {
  isDark: boolean
}

export default function FloatingSubtitleWindow({ isDark }: Props) {
  const [entries, setEntries] = useState<SubtitleEntry[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [opacity, setOpacity] = useState(0.92)
  const [expanded, setExpanded] = useState(false)
  const [displayMode, setDisplayMode] = useState<SubtitleDisplayMode>('bilingual')
  const scrollRef = useRef<HTMLDivElement>(null)
  const expandTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!window.api?.floating) return
    const unsub = window.api.floating.onSubtitlesUpdate((newEntries) => {
      setEntries(newEntries.slice(-MAX_ENTRIES))
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!window.api?.floating) return
    const unsub = window.api.floating.onSummaryUpdate((s) => setSummary(s))
    return unsub
  }, [])

  useEffect(() => {
    if (!window.api?.floating) return
    const unsub = window.api.floating.onSubtitleSettingsUpdate((settings) => {
      if (settings.displayMode) {
        setDisplayMode(settings.displayMode)
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries, expanded])

  const handleExpand = useCallback(() => {
    if (expandTimer.current) clearTimeout(expandTimer.current)
    expandTimer.current = setTimeout(() => {
      setExpanded(true)
      window.api?.floating.setExpanded(true)
    }, EXPAND_DELAY)
  }, [])

  const handleCollapse = useCallback(() => {
    if (expandTimer.current) clearTimeout(expandTimer.current)
    expandTimer.current = setTimeout(() => {
      setExpanded(false)
      window.api?.floating.setExpanded(false)
    }, EXPAND_DELAY + 100)
  }, [])

  useEffect(() => {
    return () => { if (expandTimer.current) clearTimeout(expandTimer.current) }
  }, [])

  const bgBase = isDark ? '14, 20, 36' : '255, 255, 255'
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const headerBg = isDark ? 'rgba(15, 18, 37, 0.95)' : 'rgba(248, 249, 251, 0.95)'
  const textPrimary = isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)'
  const textSecondary = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const mutedColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'
  const accentColor = isDark ? '#ffd54f' : '#e6a100'
  const colDivider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const resizeGripColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'

  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null
  const isBilingual = displayMode === 'bilingual'

  const handleClose = () => window.api?.floating.hide()

  // ── Compact pill (no hover) ──────────────────────────
  if (!expanded) {
    return (
      <Box
        className="drag"
        onMouseEnter={handleExpand}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          bgcolor: `rgba(${bgBase}, ${opacity * 0.7})`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '18px',
          border: `1px solid ${borderColor}`,
          cursor: 'default',
          WebkitAppRegion: 'drag',
          userSelect: 'none',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            bgcolor: `rgba(${bgBase}, ${opacity * 0.85})`,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
          },
          boxShadow: isDark
            ? '0 2px 12px rgba(0,0,0,0.3)'
            : '0 2px 12px rgba(0,0,0,0.06)'
        }}
      >
        <SubtitlesIcon sx={{ fontSize: 16, color: isDark ? '#60a5fa' : '#1976d2', flexShrink: 0 }} />

        {lastEntry ? (
          isBilingual ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <Typography
                noWrap
                sx={{
                  fontSize: 11,
                  color: textSecondary,
                  fontStyle: lastEntry.isFinal ? 'normal' : 'italic',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  minWidth: 0
                }}
              >
                {lastEntry.originalText || '...'}
              </Typography>
              <Box sx={{ width: 1, height: 10, bgcolor: colDivider, flexShrink: 0 }} />
              <Typography
                noWrap
                sx={{
                  fontSize: 12,
                  color: accentColor,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  minWidth: 0
                }}
              >
                {lastEntry.translatedText || '...'}
              </Typography>
            </Box>
          ) : (
            <Typography
              noWrap
              sx={{
                fontSize: 12,
                color: textPrimary,
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {lastEntry.translatedText || lastEntry.originalText || '...'}
            </Typography>
          )
        ) : (
          <Typography noWrap sx={{ fontSize: 12, color: mutedColor, flex: 1 }}>
            VoiceBridge
          </Typography>
        )}

        <Box
          className="no-drag"
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: entries.length > 0 ? (isDark ? '#4ade80' : '#16a34a') : mutedColor,
            flexShrink: 0,
            transition: 'background-color 0.3s ease'
          }}
        />
        {summary && (
          <Box
            className="no-drag"
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: isDark ? '#c084fc' : '#9333ea',
              flexShrink: 0
            }}
          />
        )}
      </Box>
    )
  }

  // ── Expanded panel (hovered) ─────────────────────────
  return (
    <Box
      onMouseLeave={handleCollapse}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: `rgba(${bgBase}, ${opacity})`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '12px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        overflow: 'hidden',
        boxShadow: isDark
          ? '0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative'
      }}
    >
      {/* Header bar */}
      <Box
        className="drag"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.5,
          minHeight: 30,
          bgcolor: headerBg,
          borderBottom: `1px solid ${borderColor}`,
          WebkitAppRegion: 'drag',
          userSelect: 'none',
          cursor: 'move',
          flexShrink: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <DragIndicatorIcon sx={{ color: mutedColor, fontSize: 14 }} />
          <Typography
            variant="caption"
            sx={{ color: textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }}
          >
            VoiceBridge
          </Typography>
          {entries.length > 0 && (
            <Typography variant="caption" sx={{ color: mutedColor, fontSize: 10 }}>
              {entries.length}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, WebkitAppRegion: 'no-drag' }}>
          <Slider
            value={opacity}
            onChange={(_, v) => setOpacity(v as number)}
            min={0.3}
            max={1}
            step={0.05}
            size="small"
            sx={{
              width: 48,
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)',
              '& .MuiSlider-thumb': { width: 9, height: 9 }
            }}
          />
          <IconButton
            size="small"
            onClick={handleClose}
            aria-label="关闭浮动字幕"
            sx={{
              width: 24,
              height: 24,
              color: mutedColor,
              '&:hover': { color: '#ef4444', bgcolor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)' }
            }}
          >
            <CloseIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Column header for bilingual mode */}
      {isBilingual && entries.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            px: 2,
            py: 0.5,
            gap: 1.5,
            borderBottom: `1px solid ${borderColor}`,
            flexShrink: 0
          }}
        >
          <Typography variant="caption" sx={{ color: mutedColor, fontSize: 9, flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            检测语音
          </Typography>
          <Typography variant="caption" sx={{ color: mutedColor, fontSize: 9, flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            中文翻译
          </Typography>
        </Box>
      )}

      {/* Subtitle content */}
      <Box
        ref={scrollRef}
        className="no-drag"
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 0.75,
          minHeight: 0,
          WebkitAppRegion: 'no-drag'
        }}
      >
        {entries.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 0.75 }}>
            <OpenWithIcon sx={{ fontSize: 20, color: mutedColor, opacity: 0.4 }} />
            <Typography variant="body2" sx={{ color: mutedColor, fontSize: 11 }}>
              等待翻译...
            </Typography>
          </Box>
        ) : isBilingual ? (
          entries.map((entry) => (
            <Box
              key={entry.id}
              sx={{
                display: 'flex',
                gap: 1.5,
                py: 0.35,
                borderBottom: `1px solid ${colDivider}`,
                '&:last-child': { borderBottom: 'none' }
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: textSecondary,
                  fontSize: 11,
                  lineHeight: 1.5,
                  fontStyle: entry.isFinal ? 'normal' : 'italic',
                  flex: 1,
                  minWidth: 0,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                {entry.originalText}
              </Typography>
              <Box sx={{ width: 1, bgcolor: colDivider, flexShrink: 0, alignSelf: 'stretch' }} />
              <Typography
                variant="body2"
                sx={{
                  color: entry.translatedText ? accentColor : mutedColor,
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  flex: 1,
                  minWidth: 0,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                {entry.translatedText || '...'}
              </Typography>
            </Box>
          ))
        ) : (
          entries.map((entry) => (
            <Box key={entry.id} sx={{ py: 0.35 }}>
              <Typography
                variant="body2"
                sx={{
                  color: entry.translatedText ? textPrimary : mutedColor,
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.6,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                {entry.translatedText || '...'}
              </Typography>
            </Box>
          ))
        )}
        {summary && entries.length > 0 && (
          <Box sx={{ mt: 0.5, pt: 0.5, borderTop: `1px solid ${borderColor}` }}>
            <Typography variant="caption" sx={{ color: isDark ? '#c084fc' : '#9333ea', fontSize: 10, fontWeight: 600 }}>
              AI 总结
            </Typography>
            <Typography variant="body2" sx={{
              color: textSecondary,
              fontSize: 11,
              lineHeight: 1.5,
              maxHeight: 60,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical'
            }}>
              {summary}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Resize grip */}
      <Box
        className="no-drag"
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 14,
          height: 14,
          cursor: 'nwse-resize',
          WebkitAppRegion: 'no-drag',
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            borderRadius: 1
          },
          '&::before': { bottom: 3, right: 3, width: 7, height: 1.5, bgcolor: resizeGripColor },
          '&::after': { bottom: 3, right: 3, width: 1.5, height: 7, bgcolor: resizeGripColor }
        }}
      />
    </Box>
  )
}
