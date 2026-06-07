import { Box, Typography, Paper, Chip, IconButton, Tooltip, Collapse, Dialog, DialogTitle, DialogActions, Button, TextField, InputAdornment, DialogContent, Tabs, Tab, CircularProgress } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import HistoryIcon from '@mui/icons-material/History'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ArticleIcon from '@mui/icons-material/Article'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import CloseIcon from '@mui/icons-material/Close'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useEffect, useState, useMemo } from 'react'
import { useHistoryStore, type HistorySession } from '../store/historyStore'
import { useSummaryStore } from '../store/summaryStore'
import MindMap from '../components/Summary/MindMap'

const modeLabels: Record<string, string> = {
  'url': 'URL 视频',
  'system-audio': '系统音频',
  'microphone': '麦克风'
}

export default function HistoryPage() {
  const { sessions, loadHistory, deleteSession, clearHistory } = useHistoryStore()
  const generateSummary = useSummaryStore((s) => s.generateSummary)
  const isGenerating = useSummaryStore((s) => s.isGenerating)
  const sessionGeneratingId = useSummaryStore((s) => s.sessionGeneratingId)

  const [searchQuery, setSearchQuery] = useState('')
  const [modeFilter, setModeFilter] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [detailSession, setDetailSession] = useState<HistorySession | null>(null)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Sync detail dialog when session summary is updated (e.g. after generating from history)
  useEffect(() => {
    if (detailSession) {
      const updated = sessions.find(s => s.id === detailSession.id)
      if (updated && updated.summary !== detailSession.summary) {
        setDetailSession(updated)
      }
    }
  }, [sessions, detailSession])

  const handleCopySession = (session: HistorySession) => {
    const text = session.entries
      .map((e) => `${e.originalText}\n${e.translatedText}`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
  }

  const formatTime = (ts: number) => new Date(ts).toLocaleString('zh-CN')

  const filteredSessions = useMemo(() => {
    let result = [...sessions]
    if (modeFilter) {
      result = result.filter(s => s.mode === modeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.entries.some(e =>
          e.originalText.toLowerCase().includes(q) ||
          e.translatedText.toLowerCase().includes(q)
        ) ||
        (s.summary && s.summary.toLowerCase().includes(q))
      )
    }
    return result
  }, [sessions, searchQuery, modeFilter])

  const handleGenerateSummary = (session: HistorySession, e: React.MouseEvent) => {
    e.stopPropagation()
    generateSummary({ entries: session.entries, sessionId: session.id })
  }

  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: 'auto', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          翻译历史
        </Typography>
        {sessions.length > 0 && (
          <Tooltip title="清空所有历史" arrow>
            <IconButton size="small" onClick={clearHistory}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Search and filter */}
      {sessions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="搜索字幕内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
          {Object.entries(modeLabels).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              size="small"
              variant={modeFilter === key ? 'filled' : 'outlined'}
              color={modeFilter === key ? 'primary' : 'default'}
              onClick={() => setModeFilter(modeFilter === key ? null : key)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      )}

      {filteredSessions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <HistoryIcon sx={{ fontSize: 56, color: 'text.disabled', opacity: 0.3, mb: 2 }} />
          <Typography color="text.secondary">
            {sessions.length === 0 ? '暂无翻译记录' : '没有匹配的记录'}
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
            {sessions.length === 0 ? '开始翻译后，记录将自动保存在此处' : '尝试调整搜索条件'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredSessions.map((session) => (
            <Paper
              key={session.id}
              elevation={0}
              onClick={() => setDetailSession(session)}
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 2px 12px var(--hover-glow)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {formatTime(session.startTime)}
                  </Typography>
                  <Chip label={modeLabels[session.mode] || session.mode} size="small" variant="outlined" color="primary" />
                  <Chip label={`${session.entries.length} 条`} size="small" variant="outlined" />
                  {session.summary && (
                    <Chip label="含总结" size="small" variant="outlined" color="secondary" />
                  )}
                  {!session.summary && (
                    <Tooltip title="为此会话生成 AI 总结" arrow>
                      <Chip
                        label={
                          sessionGeneratingId === session.id
                            ? '生成中...'
                            : '生成总结'
                        }
                        size="small"
                        icon={
                          sessionGeneratingId === session.id
                            ? <CircularProgress size={12} />
                            : <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                        }
                        variant="outlined"
                        color="primary"
                        disabled={isGenerating}
                        onClick={(e) => handleGenerateSummary(session, e as any)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.08)' } }}
                      />
                    </Tooltip>
                  )}
                </Box>
                <Box onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="复制" arrow>
                    <IconButton
                      size="small"
                      onClick={() => handleCopySession(session)}
                      sx={{ transition: 'all 0.15s ease', '&:hover': { bgcolor: 'var(--hover-glow)' } }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除" arrow>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteTarget(session.id)}
                      sx={{ transition: 'all 0.15s ease', '&:hover': { bgcolor: 'var(--hover-glow)' } }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Keywords */}
              {session.keywords && session.keywords.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                  {session.keywords.map((kw, idx) => (
                    <Chip
                      key={idx}
                      label={kw}
                      size="small"
                      sx={{
                        fontSize: 11,
                        height: 22,
                        bgcolor: 'rgba(25, 118, 210, 0.06)',
                        color: 'primary.main',
                        border: '1px solid',
                        borderColor: 'rgba(25, 118, 210, 0.15)',
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Preview: first 3 entries */}
              <Box sx={{ maxHeight: 140, overflow: 'hidden' }}>
                {session.entries.slice(0, 3).map((entry) => (
                  <Box key={entry.id} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { border: 'none' } }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                      {entry.originalText}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'secondary.main', fontSize: 14, fontWeight: 500 }}>
                      {entry.translatedText}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {session.entries.length > 3 && (
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                  ...还有 {session.entries.length - 3} 条 — 点击查看详情
                </Typography>
              )}

              {session.summary && (
                <SessionSummaryPreview summary={session.summary} />
              )}
            </Paper>
          ))}
        </Box>
      )}

      {/* Detail dialog */}
      <SessionDetailDialog
        session={detailSession}
        onClose={() => setDetailSession(null)}
        onCopy={handleCopySession}
        onDelete={(id) => { deleteSession(id); setDetailSession(null) }}
        onGenerateSummary={handleGenerateSummary}
        isGenerating={isGenerating}
        generatingSessionId={sessionGeneratingId}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>确认删除这条历史记录？</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button
            onClick={() => { if (deleteTarget) { deleteSession(deleteTarget); setDeleteTarget(null) } }}
            color="error"
            variant="contained"
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/** Inline summary preview — collapsed by default, max 3 lines */
function SessionSummaryPreview({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Box sx={{ mt: 1 }} onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          py: 0.5,
          px: 1,
          borderRadius: 1,
          bgcolor: 'rgba(156, 39, 176, 0.06)',
          border: '1px solid',
          borderColor: 'rgba(156, 39, 176, 0.12)',
          transition: 'all 0.15s ease',
          '&:hover': { bgcolor: 'rgba(156, 39, 176, 0.12)' }
        }}
      >
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: 'secondary.main'
          }}
        />
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'secondary.main' }}>
          AI 总结
        </Typography>
      </Box>
      <Collapse in={expanded}>
        <Box
          sx={{
            mt: 0.5,
            p: 1.5,
            borderRadius: 1,
            bgcolor: 'rgba(156, 39, 176, 0.03)',
            border: '1px solid',
            borderColor: 'rgba(156, 39, 176, 0.08)',
            maxHeight: 200,
            overflowY: 'auto'
          }}
        >
          <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {summary}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  )
}

/** Full detail dialog: subtitle list + summary + mind map */
function SessionDetailDialog({
  session,
  onClose,
  onCopy,
  onDelete,
  onGenerateSummary,
  isGenerating,
  generatingSessionId
}: {
  session: HistorySession | null
  onClose: () => void
  onCopy: (s: HistorySession) => void
  onDelete: (id: string) => void
  onGenerateSummary: (s: HistorySession, e: React.MouseEvent) => void
  isGenerating: boolean
  generatingSessionId: string | null
}) {
  const [tab, setTab] = useState(0)
  const showSummaryTabs = session?.summary != null

  if (!session) return null

  return (
    <Dialog
      open={!!session}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh', display: 'flex', flexDirection: 'column' }
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {new Date(session.startTime).toLocaleString('zh-CN')}
          </Typography>
          <Chip label={modeLabels[session.mode] || session.mode} size="small" color="primary" />
          <Chip label={`${session.entries.length} 条`} size="small" variant="outlined" />
          <Typography variant="caption" color="text.disabled">
            {formatDuration(session.startTime, session.endTime)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="复制全部字幕" arrow>
            <IconButton size="small" onClick={() => onCopy(session)}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="删除" arrow>
            <IconButton size="small" onClick={() => onDelete(session.id)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      {showSummaryTabs && (
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 40,
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            flexShrink: 0,
            '& .MuiTab-root': { minHeight: 40, py: 0, fontSize: '0.85rem', textTransform: 'none' }
          }}
        >
          <Tab icon={<ArticleIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="字幕" />
          <Tab icon={<ArticleIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="AI 总结" />
          <Tab icon={<AccountTreeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="思维导图" />
        </Tabs>
      )}

      {/* Content */}
      <DialogContent sx={{ flex: 1, overflow: 'auto', pt: showSummaryTabs ? 1 : 2 }}>
        {/* Summary generation prompt when no summary exists */}
        {!showSummaryTabs && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              py: 2,
              mb: 2,
              borderRadius: 1.5,
              bgcolor: 'rgba(25, 118, 210, 0.04)',
              border: '1px dashed',
              borderColor: 'primary.main',
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              此会话还没有 AI 总结
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={
                isGenerating && generatingSessionId === session.id
                  ? <CircularProgress size={14} />
                  : <AutoAwesomeIcon sx={{ fontSize: 16 }} />
              }
              disabled={isGenerating}
              onClick={(e) => onGenerateSummary(session, e as any)}
            >
              {isGenerating && generatingSessionId === session.id ? '生成中...' : '生成总结'}
            </Button>
          </Box>
        )}

        {(!showSummaryTabs || tab === 0) && (
          <Box>
            {session.entries.map((entry) => (
              <Box
                key={entry.id}
                sx={{
                  py: 1,
                  px: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background-color 0.1s ease'
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, mb: 0.25 }}>
                  {entry.originalText}
                </Typography>
                <Typography variant="body2" sx={{ color: 'secondary.main', fontSize: 15, fontWeight: 500 }}>
                  {entry.translatedText}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {showSummaryTabs && tab === 1 && (
          <Box sx={{ p: 1 }}>
            <Typography
              variant="body2"
              component="pre"
              sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.8, fontSize: 14 }}
            >
              {session.summary}
            </Typography>
          </Box>
        )}

        {showSummaryTabs && tab === 2 && (
          <Box sx={{ minHeight: 400 }}>
            <MindMap markdown={session.summary!} />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

function formatDuration(start: number, end: number): string {
  const diff = Math.max(0, end - start)
  const min = Math.floor(diff / 60000)
  const sec = Math.floor((diff % 60000) / 1000)
  if (min > 0) return `时长 ${min}分${sec}秒`
  return `时长 ${sec}秒`
}
