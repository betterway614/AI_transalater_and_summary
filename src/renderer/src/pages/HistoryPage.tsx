import { Box, Typography, Paper, Chip, IconButton, Tooltip } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useEffect, useState } from 'react'
import { useSubtitleStore } from '../store/subtitleStore'
import type { SubtitleEntry } from '@shared/types'

interface Session {
  id: string
  startTime: number
  entries: SubtitleEntry[]
}

export default function HistoryPage() {
  const entries = useSubtitleStore((s) => s.entries)
  const clearEntries = useSubtitleStore((s) => s.clearEntries)
  const [sessions, setSessions] = useState<Session[]>([])

  // Group entries into sessions (consecutive entries within 5 minutes)
  useEffect(() => {
    if (entries.length === 0) {
      setSessions([])
      return
    }

    const result: Session[] = []
    let current: SubtitleEntry[] = [entries[0]]

    for (let i = 1; i < entries.length; i++) {
      if (entries[i].timestamp - entries[i - 1].timestamp > 5 * 60 * 1000) {
        result.push({
          id: `session_${current[0].timestamp}`,
          startTime: current[0].timestamp,
          entries: current
        })
        current = [entries[i]]
      } else {
        current.push(entries[i])
      }
    }

    result.push({
      id: `session_${current[0].timestamp}`,
      startTime: current[0].timestamp,
      entries: current
    })

    setSessions(result.reverse())
  }, [entries])

  const handleCopySession = (session: Session) => {
    const text = session.entries
      .map((e) => `${e.originalText}\n${e.translatedText}`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
  }

  const formatTime = (ts: number) => new Date(ts).toLocaleString('zh-CN')

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">翻译历史</Typography>
        {entries.length > 0 && (
          <Tooltip title="清空记录">
            <IconButton size="small" onClick={clearEntries}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {sessions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">暂无翻译记录</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
            开始翻译后，记录将自动保存在此处
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sessions.map((session) => (
            <Paper
              key={session.id}
              elevation={0}
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {formatTime(session.startTime)}
                  </Typography>
                  <Chip label={`${session.entries.length} 条`} size="small" variant="outlined" />
                </Box>
                <Tooltip title="复制">
                  <IconButton size="small" onClick={() => handleCopySession(session)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
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
