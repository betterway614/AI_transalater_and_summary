import { Box } from '@mui/material'
import { ReactNode } from 'react'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <TitleBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            bgcolor: 'background.default'
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
