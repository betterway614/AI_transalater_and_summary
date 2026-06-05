import { Box, Paper, Typography, IconButton, Collapse, Tooltip } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useState } from 'react'

export default function SummaryPanel() {
  const [expanded, setExpanded] = useState(false)
  const summary: string | null = null

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
          {summary && (
            <>
              <Tooltip title="导出">
                <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                  <FileDownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="复制">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(summary)
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
        <Box sx={{ px: 2, pb: 2, minHeight: 60 }}>
          {summary ? (
            <Typography
              variant="body2"
              component="pre"
              sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.8 }}
            >
              {summary}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              翻译结束后将自动生成 AI 总结
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}
