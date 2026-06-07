import { Box, Typography, Paper, Chip, IconButton, Tooltip, Collapse, Dialog, DialogTitle, DialogActions, Button, TextField, InputAdornment } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import HistoryIcon from '@mui/icons-material/History'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import { useEffect, useState, useMemo } from 'react'
import { useHistoryStore, type HistorySession } from '../store/historyStore'
import { useSubtitleStore } from '../store/subtitleStore'

const modeLabels: Record<string, string> = {
  'url': 'URL 视频',
  'system-audio': '系统音频',
  'microphone': '麦克风'
}

export default function HistoryPage() {
  const { sessions, loadHistory, deleteSession, clearHistory } = useHistoryStore()
  const currentEntries = useSubtitleStore((s) => s.entries)

  const [searchQuery, setSearchQuery] = useState('')
  const [modeFilter, setModeFilter] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

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
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                transition: 'all 0.2s ease',
                cursor: 'default',
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
                </Box>
                <Box>
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

              <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {session.entries.slice(0, 5).map((entry) => (
                  <Box key={entry.id} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { border: 'none' } }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                      {entry.originalText}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'secondary.main', fontSize: 14, fontWeight: 500 }}>
                      {entry.translatedText}
                    </Typography>
                  </Box>
                ))}
                {session.entries.length > 5 && (
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                    ...还有 {session.entries.length - 5} 条记录
                  </Typography>
                )}
              </Box>

              {session.summary && (
                <SessionSummaryCard summary={session.summary} />
              )}
            </Paper>
          ))}
        </Box>
      )}

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

function SessionSummaryCard({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Box sx={{ mt: 1 }}>
      <Box
        onClick={() => setExpanded(!expanded)}
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
            maxHeight: 300,
            overflowY: 'auto'
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap'
            }}
          >
            {summary}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  )
}
