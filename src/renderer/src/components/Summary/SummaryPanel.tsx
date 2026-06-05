import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
  Button,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ArticleIcon from '@mui/icons-material/Article'
import { useState } from 'react'
import { useSummary } from '../../hooks/useSummary'
import { useSubtitleStore } from '../../store/subtitleStore'
import MindMap from './MindMap'

export default function SummaryPanel() {
  const [expanded, setExpanded] = useState(false)
  const [viewMode, setViewMode] = useState(0) // 0=text, 1=mindmap
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
              <Tooltip title="导出 Markdown">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExport()
                  }}
                >
                  <FileDownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="复制">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy()
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ minHeight: 60 }}>
          {isGenerating ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, pb: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                正在生成总结...
              </Typography>
            </Box>
          ) : summary ? (
            <>
              <Tabs
                value={viewMode}
                onChange={(_, v) => setViewMode(v)}
                sx={{
                  minHeight: 36,
                  borderBottom: 1,
                  borderColor: 'divider',
                  px: 1,
                  '& .MuiTab-root': { minHeight: 36, py: 0, fontSize: '0.8rem' }
                }}
              >
                <Tab icon={<ArticleIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="文本" />
                <Tab icon={<AccountTreeIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="思维导图" />
              </Tabs>
              <Box sx={{ px: 2, pb: 2, pt: 1 }}>
                {viewMode === 0 ? (
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.8 }}
                  >
                    {summary}
                  </Typography>
                ) : (
                  <MindMap markdown={summary} />
                )}
              </Box>
            </>
          ) : (
            <Box sx={{ px: 2, pb: 2 }}>
              <Typography variant="body2" color="text.disabled">
                翻译结束后点击 ✨ 按钮生成 AI 总结
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}
