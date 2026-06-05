import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import FloatingSubtitleWindow from './components/Subtitle/FloatingSubtitleWindow'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#42a5f5' },
    secondary: { main: '#ffd54f' },
    background: { default: 'transparent', paper: '#141829' },
    divider: 'rgba(255, 255, 255, 0.08)'
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { background: 'transparent' }
      }
    }
  }
})

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#e6a100' },
    background: { default: 'transparent', paper: '#ffffff' },
    divider: 'rgba(0, 0, 0, 0.08)'
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { background: 'transparent' }
      }
    }
  }
})

function ThemedFloatingApp() {
  const [isDark, setIsDark] = React.useState(true)

  React.useEffect(() => {
    if (!window.api?.floating) return
    const unsub = window.api.floating.onThemeUpdate((theme) => {
      setIsDark(theme === 'dark')
    })
    return unsub
  }, [])

  return (
    <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <CssBaseline />
      <FloatingSubtitleWindow isDark={isDark} />
    </ThemeProvider>
  )
}

console.log('[FloatingRenderer] floating-main.tsx executing, window.api available:', !!window.api)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemedFloatingApp />
  </React.StrictMode>
)
