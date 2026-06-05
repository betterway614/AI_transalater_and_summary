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

export default function ControlBar() {
  const status = useAppStore((s) => s.status)
  const isPaused = useAppStore((s) => s.isPaused)
  const showFloating = useAppStore((s) => s.showFloating)
  const stopTranslation = useAppStore((s) => s.stopTranslation)
  const pauseTranslation = useAppStore((s) => s.pauseTranslation)
  const resumeTranslation = useAppStore((s) => s.resumeTranslation)
  const setShowFloating = useAppStore((s) => s.setShowFloating)
  const entries = useSubtitleStore((s) => s.entries)

  const isRunning = status !== 'idle' && status !== 'error'

  const handleExport = async () => {
    if (!window.api) return
    const content = formatMarkdown(entries)
    await window.api.exportMarkdown(content, 'translation.md')
  }

  const handleCopy = () => {
    const content = entries.map((e) => `${e.originalText}\n${e.translatedText}`).join('\n\n')
    navigator.clipboard.writeText(content)
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
        borderColor: 'divider'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StatusBadge status={status} />

        {isRunning && (
          <>
            <Tooltip title={isPaused ? '恢复' : '暂停'}>
              <IconButton
                size="small"
                onClick={isPaused ? resumeTranslation : pauseTranslation}
              >
                {isPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="停止">
              <IconButton size="small" onClick={stopTranslation} color="error">
                <StopIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title={showFloating ? '隐藏浮动字幕' : '显示浮动字幕'}>
          <IconButton
            size="small"
            onClick={() => setShowFloating(!showFloating)}
            color={showFloating ? 'primary' : 'default'}
          >
            <SubtitlesIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="导出 Markdown">
          <span>
            <IconButton size="small" onClick={handleExport} disabled={entries.length === 0}>
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="复制全部">
          <span>
            <IconButton size="small" onClick={handleCopy} disabled={entries.length === 0}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  )
}
