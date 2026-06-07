import React, { useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import App from './App'
import { useSettingsStore } from './store/settingsStore'
import './assets/styles/global.css'

const startupLog = (...args: unknown[]) => {
  console.log(...args)
  window.api?.logToMain('info', ...args)
}
startupLog('[Renderer] main.tsx executing, window.api available:', !!window.api)

const sharedComponents = {
  MuiCssBaseline: {
    styleOverrides: {
      body: { overflow: 'hidden' }
    }
  },
  MuiPaper: {
    styleOverrides: {
      root: { transition: 'background-color 0.2s ease, border-color 0.2s ease' }
    }
  },
  MuiIconButton: {
    styleOverrides: {
      root: { transition: 'background-color 0.15s ease, color 0.15s ease, transform 0.15s ease' }
    }
  },
  MuiButton: {
    styleOverrides: {
      root: { transition: 'background-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease' }
    }
  },
  MuiChip: {
    styleOverrides: {
      root: { transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease' }
    }
  },
  MuiTab: {
    styleOverrides: {
      root: { transition: 'color 0.2s ease, background-color 0.2s ease' }
    }
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: { fontSize: '0.75rem', borderRadius: 6 }
    }
  }
}

const sharedTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
}

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#42a5f5' },
    secondary: { main: '#ffd54f' },
    background: {
      default: '#0a0e1a',
      paper: '#141829'
    },
    divider: 'rgba(255, 255, 255, 0.08)'
  },
  typography: sharedTypography,
  components: {
    ...sharedComponents,
    MuiCssBaseline: {
      styleOverrides: {
        body: { overflow: 'hidden' },
        ':root': {
          '--sidebar-bg': '#0f1225',
          '--titlebar-bg': '#0f1225',
          '--hover-glow': 'rgba(66, 165, 245, 0.08)',
          '--active-glow': 'rgba(66, 165, 245, 0.15)',
          '--z-sidebar': '10',
          '--z-floating': '100',
          '--z-dialog': '200',
          '--z-tooltip': '300'
        }
      }
    }
  }
})

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#e6a100' },
    background: {
      default: '#f0f2f5',
      paper: '#ffffff'
    },
    divider: 'rgba(0, 0, 0, 0.08)',
    text: {
      disabled: 'rgba(0, 0, 0, 0.55)'  // ensure 4.5:1 contrast on #f0f2f5
    }
  },
  typography: sharedTypography,
  components: {
    ...sharedComponents,
    MuiCssBaseline: {
      styleOverrides: {
        body: { overflow: 'hidden' },
        ':root': {
          '--sidebar-bg': '#f8f9fb',
          '--titlebar-bg': '#f8f9fb',
          '--hover-glow': 'rgba(25, 118, 210, 0.06)',
          '--active-glow': 'rgba(25, 118, 210, 0.12)',
          '--z-sidebar': '10',
          '--z-floating': '100',
          '--z-dialog': '200',
          '--z-tooltip': '300'
        }
      }
    }
  }
})

function useResolvedTheme() {
  const themeMode = useSettingsStore((s) => s.settings.general.theme)
  const [systemDark, setSystemDark] = React.useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
  )

  React.useEffect(() => {
    if (themeMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [themeMode])

  return useMemo(() => {
    if (themeMode === 'light') return lightTheme
    if (themeMode === 'dark') return darkTheme
    return systemDark ? darkTheme : lightTheme
  }, [themeMode, systemDark])
}

function ThemedApp() {
  const theme = useResolvedTheme()
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>
)
