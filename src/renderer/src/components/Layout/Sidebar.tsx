import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import TranslateIcon from '@mui/icons-material/Translate'
import HistoryIcon from '@mui/icons-material/History'
import SettingsIcon from '@mui/icons-material/Settings'
import { useLocation, useNavigate } from 'react-router-dom'
import { keyframes } from '@emotion/react'
import logoUrl from '../../assets/logo-small.svg'

const navItems = [
  { path: '/', icon: <TranslateIcon fontSize="small" />, label: '翻译' },
  { path: '/history', icon: <HistoryIcon fontSize="small" />, label: '历史' },
  { path: '/settings', icon: <SettingsIcon fontSize="small" />, label: '设置' }
]

const indicatorPulse = keyframes`
  0% { transform: scaleY(0.6); opacity: 0.6; }
  50% { transform: scaleY(1); opacity: 1; }
  100% { transform: scaleY(0.6); opacity: 0.6; }
`

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        width: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 1.5,
        gap: 0.5,
        bgcolor: 'var(--sidebar-bg)',
        borderRight: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
      }}
    >
      {/* App logo */}
      <Box
        component="img"
        src={logoUrl}
        alt="VoiceBridge"
        sx={{
          width: 36,
          height: 36,
          mb: 1.5,
          flexShrink: 0,
          borderRadius: 1.5,
          filter: 'drop-shadow(0 2px 6px rgba(37, 99, 235, 0.3))'
        }}
      />

      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <Box key={item.path} sx={{ position: 'relative', width: 40, height: 40 }}>
            {/* Active indicator */}
            <Box
              sx={{
                position: 'absolute',
                left: -4,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 3,
                height: isActive ? 20 : 0,
                bgcolor: 'primary.main',
                borderRadius: '0 2px 2px 0',
                transition: 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(isActive && {
                  animation: `${indicatorPulse} 2s ease-in-out infinite`
                })
              }}
            />
            <Tooltip title={item.label} placement="right" arrow>
              <IconButton
                onClick={() => navigate(item.path)}
                aria-label={item.label}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  bgcolor: isActive ? 'var(--active-glow)' : 'transparent',
                  '&:hover': {
                    bgcolor: isActive ? 'var(--active-glow)' : 'var(--hover-glow)',
                    color: 'primary.main',
                    transform: 'scale(1.05)'
                  },
                  '&:active': {
                    transform: 'scale(0.95)'
                  },
                  transition: 'color 0.15s ease, background-color 0.15s ease, transform 0.15s ease'
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          </Box>
        )
      })}

      <Box sx={{ flex: 1 }} />

      {/* Version indicator */}
      <Typography
        variant="caption"
        sx={{
          color: 'text.disabled',
          fontSize: 9,
          writingMode: 'vertical-rl',
          letterSpacing: 0.5,
          opacity: 0.5
        }}
      >
        v1.0
      </Typography>
    </Box>
  )
}
