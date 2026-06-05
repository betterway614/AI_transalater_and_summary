import { Box, IconButton, Tooltip } from '@mui/material'
import TranslateIcon from '@mui/icons-material/Translate'
import HistoryIcon from '@mui/icons-material/History'
import SettingsIcon from '@mui/icons-material/Settings'
import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/', icon: <TranslateIcon />, label: '翻译' },
  { path: '/history', icon: <HistoryIcon />, label: '历史' },
  { path: '/settings', icon: <SettingsIcon />, label: '设置' }
]

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
        py: 1,
        gap: 1,
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider'
      }}
    >
      {navItems.map((item) => (
        <Tooltip key={item.path} title={item.label} placement="right">
          <IconButton
            onClick={() => navigate(item.path)}
            sx={{
              color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
              bgcolor: location.pathname === item.path ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            {item.icon}
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  )
}
