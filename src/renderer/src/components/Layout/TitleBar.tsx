import { Box, IconButton, Typography } from '@mui/material'
import MinimizeIcon from '@mui/icons-material/Minimize'
import CropSquareIcon from '@mui/icons-material/CropSquare'
import CloseIcon from '@mui/icons-material/Close'

export default function TitleBar() {
  return (
    <Box
      className="drag"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 32,
        px: 2,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        WebkitAppRegion: 'drag',
        userSelect: 'none'
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
        AI 同声传译桌面助手
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, WebkitAppRegion: 'no-drag' }}>
        <IconButton
          size="small"
          onClick={() => window.api?.window.minimize()}
          sx={{ width: 32, height: 32 }}
        >
          <MinimizeIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => window.api?.window.maximize()}
          sx={{ width: 32, height: 32 }}
        >
          <CropSquareIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => window.api?.window.close()}
          sx={{
            width: 32,
            height: 32,
            '&:hover': { bgcolor: 'error.main', color: 'white' }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}
