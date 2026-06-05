import { Box, IconButton, Tooltip } from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useAppStore } from '../../store/appStore'
import { useSubtitleStore } from '../../store/subtitleStore'
import StatusBadge from './StatusBadge'

export default function ControlBar() {
  const status = useAppStore((s) => s.status)
  const entries = useSubtitleStore((s) => s.entries)

  const handleExport = async () => {
    if (!window.api) return
    const content = entries.map((e) => `${e.originalText}\n${e.translatedText}\n`).join('\n')
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
      <StatusBadge status={status} />

      <Box sx={{ display: 'flex', gap: 0.5 }}>
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
