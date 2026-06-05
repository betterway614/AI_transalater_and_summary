import {
  Box, Typography, TextField, Slider, Select, MenuItem, FormControl, InputLabel,
  Paper, Button, Divider, Chip, IconButton, InputAdornment, Tooltip, Alert
} from '@mui/material'
import { Visibility, VisibilityOff, ContentCopy, CheckCircle } from '@mui/icons-material'
import { useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { WHISPER_PRESETS, TRANSLATOR_PRESETS, WHISPER_LANGUAGES } from '@shared/constants'
import type { APIPreset } from '@shared/constants'

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings)
  const updateAI = useSettingsStore((s) => s.updateAI)
  const updateSubtitle = useSettingsStore((s) => s.updateSubtitle)
  const updateAudio = useSettingsStore((s) => s.updateAudio)

  const [showWhisperKey, setShowWhisperKey] = useState(false)
  const [showTranslatorKey, setShowTranslatorKey] = useState(false)
  const [whisperTest, setWhisperTest] = useState<{ status: string; ok: boolean | null }>({ status: '', ok: null })
  const [translatorTest, setTranslatorTest] = useState<{ status: string; ok: boolean | null }>({ status: '', ok: null })

  // Whisper 预设匹配
  const whisperPresetMatch = WHISPER_PRESETS.find(
    (p) => p.baseUrl === settings.ai.whisper.baseUrl && p.label !== '自定义'
  )
  const whisperPresetIndex = whisperPresetMatch ? WHISPER_PRESETS.indexOf(whisperPresetMatch) : WHISPER_PRESETS.length - 1

  // Translator 预设匹配
  const translatorPresetMatch = TRANSLATOR_PRESETS.find(
    (p) => p.baseUrl === settings.ai.translator.baseUrl && p.label !== '自定义'
  )
  const translatorPresetIndex = translatorPresetMatch ? TRANSLATOR_PRESETS.indexOf(translatorPresetMatch) : TRANSLATOR_PRESETS.length - 1

  const [whisperPreset, setWhisperPreset] = useState(whisperPresetIndex)
  const [translatorPreset, setTranslatorPreset] = useState(translatorPresetIndex)

  const handleWhisperPresetChange = (index: number) => {
    setWhisperPreset(index)
    const preset = WHISPER_PRESETS[index]
    if (preset.label !== '自定义') {
      updateAI({
        whisper: {
          ...settings.ai.whisper,
          baseUrl: preset.baseUrl,
          model: preset.models[0] || settings.ai.whisper.model
        }
      })
    }
  }

  const handleTranslatorPresetChange = (index: number) => {
    setTranslatorPreset(index)
    const preset = TRANSLATOR_PRESETS[index]
    if (preset.label !== '自定义') {
      updateAI({
        translator: {
          ...settings.ai.translator,
          baseUrl: preset.baseUrl,
          model: preset.models[0] || settings.ai.translator.model
        }
      })
    }
  }

  const whisperModels = WHISPER_PRESETS[whisperPreset]?.models.length > 0
    ? WHISPER_PRESETS[whisperPreset].models
    : [settings.ai.whisper.model]

  const translatorModels = TRANSLATOR_PRESETS[translatorPreset]?.models.length > 0
    ? TRANSLATOR_PRESETS[translatorPreset].models
    : [settings.ai.translator.model]

  const handleTestWhisper = async () => {
    setWhisperTest({ status: '测试中...', ok: null })
    try {
      const response = await fetch(`${settings.ai.whisper.baseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${settings.ai.whisper.apiKey}` }
      })
      setWhisperTest({
        status: response.ok ? '连接成功' : `连接失败: ${response.status}`,
        ok: response.ok
      })
    } catch {
      setWhisperTest({ status: '连接失败，请检查网络和 API Key', ok: false })
    }
  }

  const handleTestTranslator = async () => {
    setTranslatorTest({ status: '测试中...', ok: null })
    try {
      const response = await fetch(`${settings.ai.translator.baseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${settings.ai.translator.apiKey}` }
      })
      setTranslatorTest({
        status: response.ok ? '连接成功' : `连接失败: ${response.status}`,
        ok: response.ok
      })
    } catch {
      setTranslatorTest({ status: '连接失败，请检查网络和 API Key', ok: false })
    }
  }

  const renderPasswordField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    onToggleShow: () => void
  ) => (
    <TextField
      fullWidth
      size="small"
      label={label}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ mb: 2 }}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={onToggleShow} edge="end">
                {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          )
        }
      }}
    />
  )

  const renderTestButton = (
    label: string,
    onClick: () => void,
    testResult: { status: string; ok: boolean | null }
  ) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Button variant="outlined" size="small" onClick={onClick}>
        {label}
      </Button>
      {testResult.status && (
        <Chip
          label={testResult.status}
          size="small"
          color={testResult.ok === true ? 'success' : testResult.ok === null ? 'warning' : 'error'}
        />
      )}
    </Box>
  )

  return (
    <Box sx={{ p: 3, maxWidth: 600, overflow: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        设置
      </Typography>

      {/* ===== 语音识别 (Whisper) 设置 ===== */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          语音识别 (Whisper)
        </Typography>

        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>服务商预设</InputLabel>
          <Select
            value={whisperPreset}
            label="服务商预设"
            onChange={(e) => handleWhisperPresetChange(e.target.value as number)}
          >
            {WHISPER_PRESETS.map((p, i) => (
              <MenuItem key={p.label} value={i}>{p.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          size="small"
          label="API Base URL"
          value={settings.ai.whisper.baseUrl}
          onChange={(e) => updateAI({ whisper: { ...settings.ai.whisper, baseUrl: e.target.value } })}
          placeholder="https://api.openai.com"
          sx={{ mb: 2 }}
        />

        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>模型</InputLabel>
          <Select
            value={settings.ai.whisper.model}
            label="模型"
            onChange={(e) => updateAI({ whisper: { ...settings.ai.whisper, model: e.target.value } })}
          >
            {whisperModels.map((m) => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
            {!whisperModels.includes(settings.ai.whisper.model) && (
              <MenuItem value={settings.ai.whisper.model}>{settings.ai.whisper.model}</MenuItem>
            )}
          </Select>
        </FormControl>

        {renderPasswordField(
          'API Key',
          settings.ai.whisper.apiKey,
          (v) => updateAI({ whisper: { ...settings.ai.whisper, apiKey: v } }),
          showWhisperKey,
          () => setShowWhisperKey(!showWhisperKey)
        )}

        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>识别语言</InputLabel>
          <Select
            value={settings.ai.whisper.language || 'en'}
            label="识别语言"
            onChange={(e) => updateAI({ whisper: { ...settings.ai.whisper, language: e.target.value } })}
          >
            {WHISPER_LANGUAGES.map((l) => (
              <MenuItem key={l.code} value={l.code}>{l.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {renderTestButton('测试连接', handleTestWhisper, whisperTest)}
      </Paper>

      {/* ===== 翻译引擎设置 ===== */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          翻译引擎
        </Typography>

        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>服务商预设</InputLabel>
          <Select
            value={translatorPreset}
            label="服务商预设"
            onChange={(e) => handleTranslatorPresetChange(e.target.value as number)}
          >
            {TRANSLATOR_PRESETS.map((p, i) => (
              <MenuItem key={p.label} value={i}>{p.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          size="small"
          label="API Base URL"
          value={settings.ai.translator.baseUrl}
          onChange={(e) => updateAI({ translator: { ...settings.ai.translator, baseUrl: e.target.value } })}
          placeholder="https://api.deepseek.com"
          sx={{ mb: 2 }}
        />

        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>模型</InputLabel>
          <Select
            value={settings.ai.translator.model}
            label="模型"
            onChange={(e) => updateAI({ translator: { ...settings.ai.translator, model: e.target.value } })}
          >
            {translatorModels.map((m) => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
            {!translatorModels.includes(settings.ai.translator.model) && (
              <MenuItem value={settings.ai.translator.model}>{settings.ai.translator.model}</MenuItem>
            )}
          </Select>
        </FormControl>

        {renderPasswordField(
          'API Key',
          settings.ai.translator.apiKey,
          (v) => updateAI({ translator: { ...settings.ai.translator, apiKey: v } }),
          showTranslatorKey,
          () => setShowTranslatorKey(!showTranslatorKey)
        )}

        {renderTestButton('测试连接', handleTestTranslator, translatorTest)}
      </Paper>

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
