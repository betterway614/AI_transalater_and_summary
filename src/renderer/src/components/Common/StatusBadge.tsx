import { Chip, keyframes } from '@mui/material'
import type { AppStatus } from '@shared/types'

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`

const statusConfig: Record<AppStatus, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error'; animated: boolean }> = {
  idle: { label: '就绪', color: 'default', animated: false },
  connecting: { label: '连接中…', color: 'warning', animated: true },
  listening: { label: '监听中', color: 'primary', animated: true },
  translating: { label: '翻译中', color: 'success', animated: true },
  error: { label: '错误', color: 'error', animated: false }
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
      sx={{
        fontWeight: 600,
        fontSize: 12,
        minWidth: 64,
        ...(config.animated && {
          animation: `${pulse} 2s ease-in-out infinite`
        })
      }}
    />
  )
}
