import { useEffect, useRef, useState } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { select as d3Select } from 'd3-selection'
import {
  Box, IconButton, Tooltip, Typography, Dialog, DialogContent,
  Divider
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
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [zoomLevel, setZoomLevel] = useState(1)
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  // Apply CSS transform to the <g> element
  const applyTransform = () => {
    if (!svgRef.current) return
    const g = svgRef.current.querySelector('g') as SVGGElement | null
    if (!g) return
    const { x, y } = panRef.current
    const k = zoomRef.current
    g.style.transformOrigin = '0 0'
    g.style.transform = `translate(${x}px, ${y}px) scale(${k})`
  }

  useEffect(() => {
    if (!svgRef.current || !markdown) return

    try {
      const { root } = transformer.transform(markdown)
      if (!root || !root.content) return

      const options = {
        maxWidth: 260,
        initialExpandLevel: 3,
        spacingVertical: 10,
        spacingHorizontal: 80,
        paddingX: 14,
        autoFit: true,
        duration: 0,
        zoom: false,
        color: (node: any) => {
          const depth = node.state?.path?.split('.').length || 0
          const colors = isDark
            ? ['#60a5fa', '#67e8f9', '#a78bfa', '#f472b6', '#34d399', '#fbbf24']
            : ['#2563eb', '#0891b2', '#7c3aed', '#db2777', '#059669', '#d97706']
          return colors[depth % colors.length]
        },
        style: (id: string) => `
          ${id} .markmap {
            --markmap-text-color: ${isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)'};
            --markmap-circle-open-bg: ${isDark ? '#3b3f5c' : '#fff'};
            --markmap-code-bg: ${isDark ? '#1a1b26' : '#f0f0f0'};
            --markmap-code-color: ${isDark ? '#ddd' : '#555'};
          }
          ${id} .markmap-node text {
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 13px;
            fill: ${isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)'};
          }
          ${id} .markmap-foreign {
            color: ${isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)'};
          }
          ${id} .markmap-foreign a {
            color: ${isDark ? '#60a5fa' : '#2563eb'};
          }
          ${id} .markmap-link { stroke-width: 2; fill: none; }
          ${id} .markmap-node circle { stroke-width: 2; }
          ${id} .markmap-highlight rect {
            fill: ${isDark ? 'rgba(255,255,100,0.12)' : 'rgba(255,255,0,0.12)'};
          }
        `
      }

      // Clean up previous instance
      if (mmRef.current) {
        d3Select(svgRef.current).selectAll('*').remove()
        mmRef.current = null
      }

      // Reset transform state
      zoomRef.current = 1
      panRef.current = { x: 0, y: 0 }
      setZoomLevel(1)

      mmRef.current = Markmap.create(svgRef.current, options)
      mmRef.current.setData(root)

      // Disable d3-zoom event listeners on SVG
      const svg = svgRef.current
      d3Select(svg)
        .on('mousedown.zoom', null)
        .on('dblclick.zoom', null)
        .on('touchstart.zoom', null)
        .on('touchmove.zoom', null)
        .on('touchend.zoom', null)
        .on('wheel.zoom', null)

      // Remove d3-zoom internal state
      try { delete (svg as any).__zoom } catch {}

      // Wheel zoom handler
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        zoomRef.current = Math.max(0.2, Math.min(zoomRef.current * delta, 5))
        setZoomLevel(zoomRef.current)
        applyTransform()
      }

      // Drag pan handlers
      const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return
        isPanning.current = true
        lastMouse.current = { x: e.clientX, y: e.clientY }
        svg.style.cursor = 'grabbing'
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (!isPanning.current) return
        const dx = e.clientX - lastMouse.current.x
        const dy = e.clientY - lastMouse.current.y
        lastMouse.current = { x: e.clientX, y: e.clientY }
        panRef.current.x += dx
        panRef.current.y += dy
        applyTransform()
      }

      const handleMouseUp = () => {
        isPanning.current = false
        svg.style.cursor = 'grab'
      }

      svg.addEventListener('wheel', handleWheel, { passive: false })
      svg.addEventListener('mousedown', handleMouseDown)
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)

      return () => {
        svg.removeEventListener('wheel', handleWheel)
        svg.removeEventListener('mousedown', handleMouseDown)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

    } catch (err) {
      console.error('[MindMap] Failed to render:', err)
    }
  }, [markdown, isDark])

  // Zoom in button
  const handleZoomIn = () => {
    zoomRef.current = Math.min(zoomRef.current * 1.3, 5)
    setZoomLevel(zoomRef.current)
    applyTransform()
  }

  // Zoom out button
  const handleZoomOut = () => {
    zoomRef.current = Math.max(zoomRef.current / 1.3, 0.2)
    setZoomLevel(zoomRef.current)
    applyTransform()
  }

  // Fit to canvas
  const handleFit = () => {
    zoomRef.current = 1
    panRef.current = { x: 0, y: 0 }
    setZoomLevel(1)
    applyTransform()
    // Also call markmap's fit to re-layout
    mmRef.current?.fit()
  }

  // Export as PNG
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
      <Box
        className={isDark ? 'markmap-dark' : ''}
        sx={{
          display: 'flex',
          width: '100%',
          height: '100%',
          bgcolor: isDark ? '#141829' : '#ffffff',
        }}
      >
        <Box
          component="svg"
          ref={svgRef}
          sx={{
            width: '100%',
            height: '100%',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' }
          }}
        />
      </Box>

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
          <Tooltip title="缩小" arrow placement="top">
            <IconButton size="small" onClick={handleZoomOut} sx={btnSx}>
              <ZoomOutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'center', color: 'text.secondary', fontSize: 11, fontWeight: 600, userSelect: 'none' }}>
            {Math.round(zoomLevel * 100)}%
          </Typography>
          <Tooltip title="放大" arrow placement="top">
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
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 1.5 }}>
        <AccountTreeIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.3 }} />
        <Typography variant="body2" color="text.disabled">生成总结后即可查看思维导图</Typography>
      </Box>
    )
  }

  return (
    <>
      <Box sx={{ position: 'relative' }}>
        <MindMapCanvas markdown={markdown} height={400} />
        <Tooltip title="全屏查看" arrow placement="left">
          <IconButton size="small" onClick={() => setFullscreen(true)} sx={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 1.5, bgcolor: 'action.hover', backdropFilter: 'blur(8px)', transition: 'all 0.15s ease', '&:hover': { bgcolor: 'var(--hover-glow)', transform: 'scale(1.1)' } }}>
            <FullscreenIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog open={fullscreen} onClose={() => setFullscreen(false)} maxWidth={false} fullScreen PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}>
        <DialogContent sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1, zIndex: 10, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountTreeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>思维导图</Typography>
            </Box>
            <Tooltip title="退出全屏" arrow>
              <IconButton size="small" onClick={() => setFullscreen(false)} sx={{ transition: 'all 0.15s ease', '&:hover': { bgcolor: 'var(--hover-glow)' } }}>
                <FullscreenExitIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ pt: '48px', width: '100%', height: '100%' }}>
            <MindMapCanvas markdown={markdown} height={window.innerHeight - 48} />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}
