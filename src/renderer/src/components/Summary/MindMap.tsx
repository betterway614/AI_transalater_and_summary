import { useEffect, useRef, useState, useCallback } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import {
  Box, IconButton, Tooltip, Typography, Dialog, DialogContent,
  Divider, CircularProgress
} from '@mui/material'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import FitScreenIcon from '@mui/icons-material/FitScreen'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'
import ImageIcon from '@mui/icons-material/Image'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import { useTheme } from '@mui/material'

interface MindMapProps {
  markdown: string
}

const transformer = new Transformer()

function MindMapCanvas({
  markdown,
  height = 400,
  toolbar = true
}: {
  markdown: string
  height?: number
  toolbar?: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [zoomLevel, setZoomLevel] = useState(1)

  // Theme-aware markmap options
  const getMarkmapOptions = useCallback(() => ({
    maxWidth: 260,
    initialExpandLevel: 3,
    spacingVertical: 10,
    spacingHorizontal: 80,
    paddingX: 14,
    autoFit: true,
    duration: 300,
    color: (node: any) => {
      const depth = node.state?.path?.split('.').length || 0
      const colors = isDark
        ? ['#60a5fa', '#67e8f9', '#a78bfa', '#f472b6', '#34d399', '#fbbf24']
        : ['#2563eb', '#0891b2', '#7c3aed', '#db2777', '#059669', '#d97706']
      return colors[depth % colors.length]
    },
    style: (id: string) => `
      ${id} .markmap-node text {
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 13px;
        fill: ${isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)'};
      }
      ${id} .markmap-link {
        stroke-width: 2;
        fill: none;
      }
      ${id} .markmap-node circle {
        stroke-width: 2;
      }
    `
  }), [isDark])

  useEffect(() => {
    if (!svgRef.current || !markdown) return

    const { root } = transformer.transform(markdown)
    if (!root || !root.content) return

    const options = getMarkmapOptions()

    if (mmRef.current) {
      mmRef.current.setData(root)
      mmRef.current.fit()
    } else {
      mmRef.current = Markmap.create(svgRef.current, options)
      mmRef.current.setData(root)
    }
  }, [markdown, getMarkmapOptions])

  useEffect(() => {
    return () => { mmRef.current = null }
  }, [])

  const applyZoom = useCallback((newScale: number) => {
    if (!svgRef.current) return
    // Markmap renders content inside a <g> child of the SVG
    const g = svgRef.current.querySelector('g') as SVGGElement | null
    if (!g) return
    const clamped = Math.max(0.2, Math.min(newScale, 5))
    g.style.transition = 'transform 0.2s ease'
    g.style.transformOrigin = 'center center'
    g.style.transform = `scale(${clamped})`
    setZoomLevel(clamped)
    setTimeout(() => { g.style.transition = '' }, 250)
  }, [])

  const handleZoomIn = () => applyZoom(zoomLevel * 1.3)
  const handleZoomOut = () => applyZoom(zoomLevel / 1.3)

  const handleFit = () => {
    if (!svgRef.current) return
    const g = svgRef.current.querySelector('g') as SVGGElement | null
    if (g) {
      g.style.transition = 'transform 0.3s ease'
      g.style.transform = 'scale(1)'
      setTimeout(() => { g.style.transition = '' }, 350)
    }
    mmRef.current?.fit()
    setZoomLevel(1)
  }

  const handleExportImage = () => {
    if (!svgRef.current) return
    const svgEl = svgRef.current
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx.scale(2, 2)
      ctx.fillStyle = isDark ? '#141829' : '#ffffff'
      ctx.fillRect(0, 0, img.width, img.height)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      const link = document.createElement('a')
      link.download = 'mindmap.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url
  }

  const btnSx = {
    width: 30,
    height: 30,
    borderRadius: 1.5,
    transition: 'all 0.15s ease',
    '&:hover': { bgcolor: 'var(--hover-glow)', transform: 'scale(1.1)' },
    '&:active': { transform: 'scale(0.95)' }
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: isDark ? 'rgba(10, 14, 26, 0.5)' : 'rgba(240, 242, 245, 0.5)',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      {/* SVG canvas */}
      <Box
        component="svg"
        ref={svgRef}
        sx={{
          width: '100%',
          height: '100%'
        }}
      />

      {/* Toolbar */}
      {toolbar && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            bgcolor: isDark ? 'rgba(20, 24, 41, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            px: 0.5,
            py: 0.25,
            boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.08)'
          }}
        >
          <Tooltip title="缩小 (-)" arrow placement="top">
            <IconButton size="small" onClick={handleZoomOut} sx={btnSx}>
              <ZoomOutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Typography
            variant="caption"
            sx={{
              minWidth: 36,
              textAlign: 'center',
              color: 'text.secondary',
              fontSize: 11,
              fontWeight: 600,
              userSelect: 'none'
            }}
          >
            {Math.round(zoomLevel * 100)}%
          </Typography>

          <Tooltip title="放大 (+)" arrow placement="top">
            <IconButton size="small" onClick={handleZoomIn} sx={btnSx}>
              <ZoomInIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />

          <Tooltip title="适应画布" arrow placement="top">
            <IconButton size="small" onClick={handleFit} sx={btnSx}>
              <FitScreenIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="导出图片" arrow placement="top">
            <IconButton size="small" onClick={handleExportImage} sx={btnSx}>
              <ImageIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  )
}

export default function MindMap({ markdown }: MindMapProps) {
  const [fullscreen, setFullscreen] = useState(false)

  if (!markdown) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 300,
          gap: 1.5
        }}
      >
        <AccountTreeIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.3 }} />
        <Typography variant="body2" color="text.disabled">
          生成总结后即可查看思维导图
        </Typography>
      </Box>
    )
  }

  return (
    <>
      {/* Mind map with fullscreen toggle */}
      <Box sx={{ position: 'relative' }}>
        <MindMapCanvas markdown={markdown} height={400} />

        {/* Fullscreen button - top right of the canvas */}
        <Tooltip title="全屏查看" arrow placement="left">
          <IconButton
            size="small"
            onClick={() => setFullscreen(true)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 30,
              height: 30,
              borderRadius: 1.5,
              bgcolor: 'action.hover',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: 'var(--hover-glow)', transform: 'scale(1.1)' }
            }}
          >
            <FullscreenIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Fullscreen dialog */}
      <Dialog
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        maxWidth={false}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: 'background.default',
            backgroundImage: 'none'
          }
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>
          {/* Top bar */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
              zIndex: 10,
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountTreeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                思维导图
              </Typography>
            </Box>
            <Tooltip title="退出全屏" arrow>
              <IconButton
                size="small"
                onClick={() => setFullscreen(false)}
                sx={{
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: 'var(--hover-glow)' }
                }}
              >
                <FullscreenExitIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Full screen mind map */}
          <Box sx={{ pt: '48px', width: '100%', height: '100%' }}>
            <MindMapCanvas markdown={markdown} height={window.innerHeight - 48} />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}
