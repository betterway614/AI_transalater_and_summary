import { Box, IconButton, Typography, Tooltip } from '@mui/material'
import MinimizeIcon from '@mui/icons-material/Minimize'
import CropSquareIcon from '@mui/icons-material/CropSquare'
import CloseIcon from '@mui/icons-material/Close'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import { useSettingsStore } from '../../store/settingsStore'

const themeOrder = ['system', 'light', 'dark'] as const
const themeIcons = {
  system: <SettingsBrightnessIcon fontSize="small" />,
  light: <LightModeIcon fontSize="small" />,
  dark: <DarkModeIcon fontSize="small" />
}
const themeLabels = {
  system: '跟随系统',
  light: '浅色模式',
  dark: '深色模式'
}

export default function TitleBar() {
  const theme = useSettingsStore((s) => s.settings.general.theme)
  const updateGeneral = useSettingsStore((s) => s.updateGeneral)

  const cycleTheme = () => {
    const idx = themeOrder.indexOf(theme)
    const next = themeOrder[(idx + 1) % themeOrder.length]
    updateGeneral({ theme: next })
  }

  return (
    <Box
      className="drag"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 36,
        px: 2,
        bgcolor: 'var(--titlebar-bg)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: 0.3,
          color: 'text.primary'
        }}
      >
        VoiceBridge · 语桥
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
        {/* Theme toggle */}
        <Tooltip title={themeLabels[theme]} arrow>
          <IconButton
            size="small"
            onClick={cycleTheme}
            aria-label="切换主题"
            sx={{
              width: 28,
              height: 28,
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                bgcolor: 'var(--hover-glow)'
              }
            }}
          >
            {themeIcons[theme]}
          </IconButton>
        </Tooltip>

        {/* Window controls */}
        <Tooltip title="最小化" arrow>
          <IconButton
            size="small"
            onClick={() => window.api?.window.minimize()}
            aria-label="最小化"
            sx={{
              width: 28,
              height: 28,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <MinimizeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="最大化" arrow>
          <IconButton
            size="small"
            onClick={() => window.api?.window.maximize()}
            aria-label="最大化/还原"
            sx={{
              width: 28,
              height: 28,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <CropSquareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="关闭" arrow>
          <IconButton
            size="small"
            onClick={() => window.api?.window.close()}
            aria-label="关闭窗口"
            sx={{
              width: 28,
              height: 28,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'error.main', color: 'white' }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}
