import { Box, Typography, TextField, Slider, Select, MenuItem, FormControl, InputLabel, Paper, Button, Divider, Chip } from '@mui/material'
import { useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings)
  const updateAI = useSettingsStore((s) => s.updateAI)
  const updateSubtitle = useSettingsStore((s) => s.updateSubtitle)
  const updateAudio = useSettingsStore((s) => s.updateAudio)
  const [testStatus, setTestStatus] = useState<string | null>(null)

  const handleTestConnection = async () => {
    setTestStatus('测试中...')
    try {
      const response = await fetch(`${settings.ai.translator.baseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${settings.ai.translator.apiKey}` }
      })
      setTestStatus(response.ok ? '连接成功' : `连接失败: ${response.status}`)
    } catch {
      setTestStatus('连接失败，请检查网络和 API Key')
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h5" gutterBottom>
        设置
      </Typography>

      {/* 字幕设置 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          字幕设置
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          字体大小: {settings.subtitle.fontSize}px
        </Typography>
        <Slider
          value={settings.subtitle.fontSize}
          onChange={(_, v) => updateSubtitle({ fontSize: v as number })}
          min={12}
          max={32}
          step={1}
          sx={{ mb: 2 }}
        />

        <Typography variant="body2" color="text.secondary" gutterBottom>
          最大行数: {settings.subtitle.maxLines}
        </Typography>
        <Slider
          value={settings.subtitle.maxLines}
          onChange={(_, v) => updateSubtitle({ maxLines: v as number })}
          min={5}
          max={30}
          step={1}
          sx={{ mb: 2 }}
        />
      </Paper>

      {/* AI 引擎设置 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          AI 引擎设置
        </Typography>

        <TextField
          fullWidth
          size="small"
          label="Whisper API Key"
          type="password"
          value={settings.ai.whisper.apiKey}
          onChange={(e) => updateAI({ whisper: { ...settings.ai.whisper, apiKey: e.target.value } })}
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 2 }} />

        <TextField
          fullWidth
          size="small"
          label="DeepSeek API Key"
          type="password"
          value={settings.ai.translator.apiKey}
          onChange={(e) =>
            updateAI({ translator: { ...settings.ai.translator, apiKey: e.target.value } })
          }
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          size="small"
          label="DeepSeek Base URL"
          value={settings.ai.translator.baseUrl}
          onChange={(e) =>
            updateAI({ translator: { ...settings.ai.translator, baseUrl: e.target.value } })
          }
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleTestConnection}>
            测试连接
          </Button>
          {testStatus && (
            <Chip
              label={testStatus}
              size="small"
              color={testStatus.includes('成功') ? 'success' : testStatus.includes('测试') ? 'warning' : 'error'}
            />
          )}
        </Box>
      </Paper>

      {/* 音频设置 */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          音频设置
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          VAD 灵敏度
        </Typography>
        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <Select
            value={settings.audio.vadSensitivity}
            onChange={(e) => updateAudio({ vadSensitivity: e.target.value as any })}
          >
            <MenuItem value="low">低（仅检测明显语音）</MenuItem>
            <MenuItem value="medium">中（推荐）</MenuItem>
            <MenuItem value="high">高（检测轻微语音）</MenuItem>
          </Select>
        </FormControl>
      </Paper>
    </Box>
  )
}
