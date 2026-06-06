import { Box, Typography, Paper, Chip, IconButton, Tooltip } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import HistoryIcon from '@mui/icons-material/History'
import { useEffect } from 'react'
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

  const allSessions = [...sessions]

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          翻译历史
        </Typography>
        {allSessions.length > 0 && (
          <Tooltip title="清空所有历史" arrow>
            <IconButton size="small" onClick={clearHistory}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {allSessions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <HistoryIcon sx={{ fontSize: 56, color: 'text.disabled', opacity: 0.3, mb: 2 }} />
          <Typography color="text.secondary">暂无翻译记录</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
            开始翻译后，记录将自动保存在此处
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {allSessions.map((session) => (
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
                      onClick={() => deleteSession(session.id)}
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
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  )
}
