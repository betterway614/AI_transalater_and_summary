import { Box } from '@mui/material'
import { ReactNode } from 'react'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        transition: 'background-color 0.3s ease'
      }}
    >
      <TitleBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            bgcolor: 'background.default',
            transition: 'background-color 0.3s ease'
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
