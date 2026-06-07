import { Box, IconButton, Tooltip } from '@mui/material'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SubtitlesIcon from '@mui/icons-material/Subtitles'
import TextSnippetIcon from '@mui/icons-material/TextSnippet'
import { useEffect, useCallback, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { useSubtitleStore } from '../../store/subtitleStore'
import { useSummaryStore } from '../../store/summaryStore'
import { formatMarkdown, formatPlainText } from '../../utils/markdown-exporter'
import StatusBadge from './StatusBadge'

interface ControlBarProps {
  onStart?: () => void
  onStop?: () => void
  audioLevelRef?: React.MutableRefObject<number>
}

export default function ControlBar({ onStart, onStop, audioLevelRef }: ControlBarProps) {
  const status = useAppStore((s) => s.status)
  const isPaused = useAppStore((s) => s.isPaused)
  const showFloating = useAppStore((s) => s.showFloating)
  const pauseTranslation = useAppStore((s) => s.pauseTranslation)
  const resumeTranslation = useAppStore((s) => s.resumeTranslation)
  const setShowFloating = useAppStore((s) => s.setShowFloating)
  const entries = useSubtitleStore((s) => s.entries)
  const summary = useSummaryStore((s) => s.summary)

  const isRunning = status !== 'idle' && status !== 'error'
  const [levelPercent, setLevelPercent] = useState(0)

  // Audio level polling
  useEffect(() => {
    if (!isRunning || !audioLevelRef) { setLevelPercent(0); return }
    const id = setInterval(() => {
      const db = audioLevelRef.current
      const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100))
      setLevelPercent(pct)
    }, 100)
    return () => clearInterval(id)
  }, [isRunning, audioLevelRef])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable) return

    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault()
      if (onStop) onStop()
    }

    if (e.code === 'Space' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      if (isRunning) {
        if (isPaused) {
          resumeTranslation()
        } else {
          pauseTranslation()
        }
      }
    }
  }, [isRunning, isPaused, onStop, pauseTranslation, resumeTranslation])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleStop = () => {
    onStop?.()
  }

  const handleExport = async () => {
    if (!window.api) return
    const content = formatMarkdown(entries)
    await window.api.exportMarkdown(content, 'translation.md')
  }

  const handleCopy = () => {
    const content = entries.map((e) => `${e.originalText}\n${e.translatedText}`).join('\n\n')
    navigator.clipboard.writeText(content)
  }

  const handleCopyPlainText = () => {
    const content = formatPlainText(entries, summary)
    navigator.clipboard.writeText(content)
  }

  const iconBtnSx = {
    width: 32,
    height: 32,
    borderRadius: 1.5,
    transition: 'all 0.15s ease',
    '&:hover': {
      bgcolor: 'var(--hover-glow)',
      transform: 'scale(1.08)'
    },
    '&:active': {
      transform: 'scale(0.95)'
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.2s ease, border-color 0.2s ease'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StatusBadge status={status} />

        {isRunning && (
          <>
            {/* Audio level indicator */}
            <Box sx={{
              width: 48,
              height: 6,
              borderRadius: 3,
              bgcolor: 'divider',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <Box sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${levelPercent}%`,
                bgcolor: levelPercent > 80 ? 'error.main' : levelPercent > 50 ? 'warning.main' : 'success.main',
                borderRadius: 3,
                transition: 'width 0.1s ease, background-color 0.2s ease'
              }} />
            </Box>

            <Tooltip title={isPaused ? '恢复 (Space)' : '暂停 (Space)'} arrow>
              <IconButton
                size="small"
                onClick={isPaused ? resumeTranslation : pauseTranslation}
                sx={iconBtnSx}
              >
                {isPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="停止 (Ctrl+Enter)" arrow>
              <IconButton size="small" onClick={handleStop} color="error" sx={iconBtnSx}>
                <StopIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title={showFloating ? '隐藏浮动字幕' : '显示浮动字幕'} arrow>
          <IconButton
            size="small"
            onClick={() => setShowFloating(!showFloating)}
            color={showFloating ? 'primary' : 'default'}
            sx={iconBtnSx}
          >
            <SubtitlesIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="导出 Markdown" arrow>
          <span>
            <IconButton size="small" onClick={handleExport} disabled={entries.length === 0} sx={iconBtnSx}>
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="复制全部" arrow>
          <span>
            <IconButton size="small" onClick={handleCopy} disabled={entries.length === 0} sx={iconBtnSx}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="复制纯文本(含总结)" arrow>
          <span>
            <IconButton size="small" onClick={handleCopyPlainText} disabled={entries.length === 0} sx={iconBtnSx}>
              <TextSnippetIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  )
}
