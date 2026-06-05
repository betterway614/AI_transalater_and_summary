import { Box, Paper, Typography, IconButton, Collapse, Tooltip, Button, CircularProgress } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useState } from 'react'
import { useSummary } from '../../hooks/useSummary'
import { useSubtitleStore } from '../../store/subtitleStore'

export default function SummaryPanel() {
  const [expanded, setExpanded] = useState(false)
  const { summary, isGenerating, generateSummary } = useSummary()
  const entries = useSubtitleStore((s) => s.entries)
  const hasEntries = entries.some((e) => e.isFinal)

  const handleExport = async () => {
    if (!summary || !window.api) return
    await window.api.exportMarkdown(summary, 'summary.md')
  }

  const handleCopy = () => {
    if (summary) navigator.clipboard.writeText(summary)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' }
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="subtitle2" color="text.secondary">
          AI 总结
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {hasEntries && !summary && !isGenerating && (
            <Tooltip title="生成总结">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  generateSummary()
                }}
              >
                <AutoAwesomeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {summary && (
            <>
              <Tooltip title="导出">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleExport() }}>
                  <FileDownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="复制">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCopy() }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2, minHeight: 60 }}>
          {isGenerating ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                正在生成总结...
              </Typography>
            </Box>
          ) : summary ? (
            <Typography
              variant="body2"
              component="pre"
              sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.8 }}
            >
              {summary}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              翻译结束后点击 ✨ 按钮生成 AI 总结
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}
