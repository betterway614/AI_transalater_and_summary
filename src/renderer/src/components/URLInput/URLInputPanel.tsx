import { TextField, Button, Paper, Select, MenuItem, FormControl, InputLabel, Chip, Typography, Box, CircularProgress, LinearProgress } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import type { VideoInfo, InputMode } from '@shared/types'

interface URLInputPanelProps {
  onStartUrl: (url: string, mode: InputMode, options?: { partIndex?: number }) => void
  onStopUrl: () => void
  getDownloadProgress: () => number
}

export default function URLInputPanel({ onStartUrl, onStopUrl, getDownloadProgress }: URLInputPanelProps) {
  const [url, setUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [selectedPart, setSelectedPart] = useState(0)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [infoError, setInfoError] = useState('')

  const status = useAppStore((s) => s.status)
  const mode = useAppStore((s) => s.mode)
  const startTranslation = useAppStore((s) => s.startTranslation)
  const stopTranslation = useAppStore((s) => s.stopTranslation)
  const setShowFloating = useAppStore((s) => s.setShowFloating)

  const [downloadProgress, setDownloadProgress] = useState(0)

  const isRunning = status !== 'idle' && status !== 'error'

  useEffect(() => {
    if (!isRunning) { setDownloadProgress(0); return }
    const id = setInterval(() => {
      const p = getDownloadProgress()
      setDownloadProgress(p)
    }, 300)
    return () => clearInterval(id)
  }, [isRunning, getDownloadProgress])

  const fetchInfo = useCallback(async () => {
    if (!url.trim()) return
    setLoadingInfo(true)
    setInfoError('')
    setVideoInfo(null)

    // Auto-detect platform cookies
    const cookiesPath = await window.api.auth.detectPlatform(url.trim())
    if (cookiesPath) {
      await window.api.ytdlp.setCookies(cookiesPath)
    }

    const result = await window.api.ytdlp.getInfo(url.trim())
    setLoadingInfo(false)

    if ('error' in result) {
      setInfoError(result.error)
    } else {
      setVideoInfo(result as VideoInfo)
      setSelectedPart(0)
    }
  }, [url])

  const handleToggle = () => {
    if (isRunning) {
      onStopUrl()
      stopTranslation()
    } else {
      if (!url.trim()) return
      startTranslation()
      onStartUrl(url.trim(), mode, {
        partIndex: videoInfo && videoInfo.partCount > 1 ? selectedPart : undefined
      })
      setShowFloating(true)
    }
  }

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.2s ease, border-color 0.2s ease'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="请输入视频 URL（YouTube、B站等）..."
          value={url}
          onChange={(e) => { setUrl(e.target.value); setVideoInfo(null); setInfoError('') }}
          disabled={isRunning}
          onKeyDown={(e) => { if (e.key === 'Enter' && !isRunning) fetchInfo() }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
        />
        <Button
          size="small"
          onClick={fetchInfo}
          disabled={isRunning || loadingInfo || !url.trim()}
          sx={{ minWidth: 40, px: 1 }}
        >
          {loadingInfo ? <CircularProgress size={18} /> : <InfoOutlinedIcon fontSize="small" />}
        </Button>
        <Button
          variant="contained"
          onClick={handleToggle}
          startIcon={isRunning ? <StopIcon /> : <PlayArrowIcon />}
          color={isRunning ? 'error' : 'primary'}
          sx={{ minWidth: 100, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, transition: 'background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease', '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 } }}
        >
          {isRunning ? '停止' : '开始'}
        </Button>
      </Box>

      {/* Download progress bar */}
      {isRunning && status === 'connecting' && downloadProgress > 0 && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant="determinate" value={downloadProgress * 100} sx={{ borderRadius: 1, height: 6 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            下载中 {Math.round(downloadProgress * 100)}%
          </Typography>
        </Box>
      )}

      {infoError && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block', whiteSpace: 'pre-line' }}>
          {infoError}
        </Typography>
      )}

      {videoInfo && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minHeight: 32 }}>
          <Chip label={videoInfo.siteName} size="small" color="primary" variant="outlined" />
          <Typography variant="caption" noWrap sx={{ flex: 1 }}>
            {videoInfo.title}
          </Typography>
          {videoInfo.uploader && (
            <Typography variant="caption" color="text.secondary">
              {videoInfo.uploader}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {formatDuration(videoInfo.duration)}
          </Typography>

          {videoInfo.partCount > 1 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>分P选择</InputLabel>
              <Select
                value={selectedPart}
                label="分P选择"
                onChange={(e) => setSelectedPart(Number(e.target.value))}
              >
                {videoInfo.parts.map((part) => (
                  <MenuItem key={part.index} value={part.index}>
                    P{part.index + 1}: {part.title.length > 30 ? part.title.slice(0, 30) + '…' : part.title}
                    {' '}({formatDuration(part.duration)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      )}
    </Paper>
  )
}
