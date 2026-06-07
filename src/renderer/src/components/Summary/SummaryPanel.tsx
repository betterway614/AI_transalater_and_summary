import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  Select,
  MenuItem,
  FormControl
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ArticleIcon from '@mui/icons-material/Article'
import GroupsIcon from '@mui/icons-material/Groups'
import SchoolIcon from '@mui/icons-material/School'
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver'
import { useState } from 'react'
import { useSummary } from '../../hooks/useSummary'
import { useSubtitleStore } from '../../store/subtitleStore'
import { useSettingsStore } from '../../store/settingsStore'
import MindMap from './MindMap'

const ICON_MAP: Record<string, React.ElementType> = {
  AccountTreeIcon,
  GroupsIcon,
  SchoolIcon,
  RecordVoiceOverIcon,
  AutoAwesomeIcon,
}

export default function SummaryPanel() {
  const [expanded, setExpanded] = useState(false)
  const [viewMode, setViewMode] = useState(0) // 0=text, 1=mindmap
  const { summary, isGenerating, generateSummary } = useSummary()
  const entries = useSubtitleStore((s) => s.entries)
  const settings = useSettingsStore((s) => s.settings)
  const setActiveTemplate = useSettingsStore((s) => s.setActiveTemplate)
  const hasEntries = entries.some((e) => e.isFinal)

  const templates = settings.general.summaryTemplates
  const activeId = settings.general.activeTemplateId

  const handleExport = async () => {
    if (!summary || !window.api) return
    await window.api.exportMarkdown(summary, 'summary.md')
  }

  const handleCopy = () => {
    if (summary) navigator.clipboard.writeText(summary)
  }

  const iconBtnSx = {
    width: 28,
    height: 28,
    transition: 'background-color 0.15s ease, transform 0.15s ease',
    '&:hover': {
      bgcolor: 'var(--hover-glow)',
      transform: 'scale(1.1)'
    },
    '&:active': {
      transform: 'scale(0.9)'
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        transition: 'background-color 0.2s ease, border-color 0.2s ease'
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
          transition: 'background-color 0.15s ease',
          '&:hover': { bgcolor: 'var(--hover-glow)' }
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          AI 总结
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {summary && (
            <Chip label="AI 生成" size="small" color="secondary" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
          )}
          {templates.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={activeId || templates[0]?.id || ''}
                onChange={(e) => {
                  e.stopPropagation()
                  setActiveTemplate(e.target.value)
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{ fontSize: 11, height: 28, '& .MuiSelect-select': { py: 0.5 } }}
              >
                {templates.map((t) => {
                  const IconComp = ICON_MAP[t.icon] || AutoAwesomeIcon
                  return (
                    <MenuItem key={t.id} value={t.id} sx={{ fontSize: 12 }}>
                      <IconComp sx={{ fontSize: 14, mr: 0.5 }} />
                      {t.name}
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
          )}
          {hasEntries && !summary && !isGenerating && (
            <Tooltip title="生成总结" arrow>
              <IconButton
                size="small"
                sx={{ ...iconBtnSx, color: 'primary.main' }}
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
              <Tooltip title="导出 Markdown" arrow>
                <IconButton
                  size="small"
                  sx={iconBtnSx}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExport()
                  }}
                >
                  <FileDownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="复制" arrow>
                <IconButton
                  size="small"
                  sx={iconBtnSx}
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
          <Box sx={{ transition: 'transform 0.2s ease', transform: expanded ? 'rotate(0)' : 'rotate(0)' }}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>
        </Box>
      </Box>

      <Collapse in={expanded} timeout={250}>
        <Box sx={{ minHeight: 60 }}>
          {isGenerating ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, pb: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                正在生成总结…
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
                  '& .MuiTab-root': {
                    minHeight: 36,
                    py: 0,
                    fontSize: '0.8rem',
                    transition: 'color 0.2s ease'
                  },
                  '& .MuiTabs-indicator': {
                    height: 2,
                    borderRadius: '2px 2px 0 0'
                  }
                }}
              >
                <Tab icon={<ArticleIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="文本" />
                <Tab icon={<AccountTreeIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="思维导图" />
              </Tabs>
              <Box sx={{ px: 2, pb: 2, pt: 1, maxHeight: 400, overflow: 'auto' }}>
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
                翻译结束后点击 <AutoAwesomeIcon sx={{ fontSize: 14, verticalAlign: 'middle', color: 'primary.main' }} /> 按钮生成总结，也可在历史记录中对已有会话生成总结
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}
