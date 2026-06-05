import { Chip } from '@mui/material'
import type { AppStatus } from '@shared/types'

const statusConfig: Record<AppStatus, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  idle: { label: '就绪', color: 'default' },
  connecting: { label: '连接中...', color: 'warning' },
  listening: { label: '监听中', color: 'primary' },
  translating: { label: '翻译中', color: 'success' },
  error: { label: '错误', color: 'error' }
}

interface StatusBadgeProps {
  status: AppStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant={status === 'idle' ? 'outlined' : 'filled'}
      sx={{ fontWeight: 600, fontSize: 12 }}
    />
  )
}
