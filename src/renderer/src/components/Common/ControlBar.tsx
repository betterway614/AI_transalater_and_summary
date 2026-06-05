import { Box, IconButton, Tooltip } from '@mui/material'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SubtitlesIcon from '@mui/icons-material/Subtitles'
import { useAppStore } from '../../store/appStore'
import { useSubtitleStore } from '../../store/subtitleStore'
import { formatMarkdown } from '../../utils/markdown-exporter'
import StatusBadge from './StatusBadge'

interface ControlBarProps {
  onStart?: () => void
  onStop?: () => void
}

export default function ControlBar({ onStart, onStop }: ControlBarProps) {
  const status = useAppStore((s) => s.status)
  const isPaused = useAppStore((s) => s.isPaused)
  const showFloating = useAppStore((s) => s.showFloating)
  const pauseTranslation = useAppStore((s) => s.pauseTranslation)
  const resumeTranslation = useAppStore((s) => s.resumeTranslation)
  const setShowFloating = useAppStore((s) => s.setShowFloating)
  const entries = useSubtitleStore((s) => s.entries)

  const isRunning = status !== 'idle' && status !== 'error'

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
            <Tooltip title={isPaused ? '恢复' : '暂停'} arrow>
              <IconButton
                size="small"
                onClick={isPaused ? resumeTranslation : pauseTranslation}
                sx={iconBtnSx}
              >
                {isPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="停止" arrow>
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
      </Box>
    </Box>
  )
}
