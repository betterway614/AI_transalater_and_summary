import { Box, Typography } from '@mui/material'

export default function HistoryPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        翻译历史
      </Typography>
      <Typography color="text.secondary">暂无翻译记录</Typography>
    </Box>
  )
}
