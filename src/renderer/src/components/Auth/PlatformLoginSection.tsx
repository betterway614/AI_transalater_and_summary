import { useState, useEffect, useCallback } from 'react'
import { Box, Button, Chip, Typography, CircularProgress } from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'

interface Platform {
  id: string
  name: string
}

export default function PlatformLoginSection() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loggedIn, setLoggedIn] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [plats, logged] = await Promise.all([
      window.api.auth.getPlatforms(),
      window.api.auth.getLoggedIn()
    ])
    setPlatforms(plats)
    setLoggedIn(new Set(logged))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleLogin = async (platformId: string) => {
    setLoading(platformId)
    const result = await window.api.auth.login(platformId)
    setLoading(null)
    if (result.success) {
      refresh()
    } else if (result.error) {
      console.error('Login failed:', result.error)
    }
  }

  const handleLogout = async (platformId: string) => {
    await window.api.auth.logout(platformId)
    refresh()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {platforms.map((p) => {
        const isLoggedIn = loggedIn.has(p.id)
        const isLoading = loading === p.id

        return (
          <Box
            key={p.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 0.5
            }}
          >
            <Typography variant="body2" sx={{ minWidth: 60, fontWeight: 500 }}>
              {p.name}
            </Typography>

            {isLoggedIn ? (
              <>
                <Chip label="已登录" size="small" color="success" variant="outlined" />
                <Button
                  size="small"
                  startIcon={<LogoutIcon />}
                  onClick={() => handleLogout(p.id)}
                  color="error"
                  sx={{ ml: 'auto' }}
                >
                  注销
                </Button>
              </>
            ) : (
              <Button
                size="small"
                variant="outlined"
                startIcon={isLoading ? <CircularProgress size={14} /> : <LoginIcon />}
                onClick={() => handleLogin(p.id)}
                disabled={isLoading}
              >
                {isLoading ? '登录中...' : '扫码登录'}
              </Button>
            )}
          </Box>
        )
      })}

      {platforms.length === 0 && (
        <Typography variant="body2" color="text.secondary">Loading...</Typography>
      )}
    </Box>
  )
}
