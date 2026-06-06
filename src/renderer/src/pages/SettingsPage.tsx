import {
  Box, Typography, TextField, Slider, Select, MenuItem, FormControl, InputLabel,
  Paper, Button, Divider, Chip, IconButton, InputAdornment, Tooltip, Alert,
  ToggleButtonGroup, ToggleButton
} from '@mui/material'
import { Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import TuneIcon from '@mui/icons-material/Tune'
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver'
import TranslateIcon from '@mui/icons-material/Translate'
import SubtitlesIcon from '@mui/icons-material/Subtitles'
import HeadsetIcon from '@mui/icons-material/Headset'
import LoginIcon from '@mui/icons-material/Login'
import { useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { WHISPER_PRESETS, TRANSLATOR_PRESETS, WHISPER_LANGUAGES } from '@shared/constants'
import type { APIPreset } from '@shared/constants'
import PlatformLoginSection from '../components/Auth/PlatformLoginSection'

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 15 }}>
        {title}
      </Typography>
    </Box>
  )
}

const paperSx = {
  p: 2.5,
  mb: 2,
  bgcolor: 'background.paper',
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  transition: 'background-color 0.2s ease, border-color 0.2s ease'
}

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings)
  const updateAI = useSettingsStore((s) => s.updateAI)
  const updateSubtitle = useSettingsStore((s) => s.updateSubtitle)
  const updateAudio = useSettingsStore((s) => s.updateAudio)
  const updateGeneral = useSettingsStore((s) => s.updateGeneral)

  const [showWhisperKey, setShowWhisperKey] = useState(false)
  const [showTranslatorKey, setShowTranslatorKey] = useState(false)
  const [whisperTest, setWhisperTest] = useState<{ status: string; ok: boolean | null }>({ status: '', ok: null })
  const [translatorTest, setTranslatorTest] = useState<{ status: string; ok: boolean | null }>({ status: '', ok: null })

  const whisperPresetMatch = WHISPER_PRESETS.find(
    (p) => p.baseUrl === settings.ai.whisper.baseUrl && p.label !== '自定义'
  )
  const whisperPresetIndex = whisperPresetMatch ? WHISPER_PRESETS.indexOf(whisperPresetMatch) : WHISPER_PRESETS.length - 1

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
      const result = await window.api.ai.testConnection({
        baseUrl: settings.ai.whisper.baseUrl,
        apiKey: settings.ai.whisper.apiKey
      })
      setWhisperTest({
        status: result.ok ? '连接成功' : `连接失败: ${result.status}`,
        ok: result.ok
      })
    } catch {
      setWhisperTest({ status: '连接失败，请检查网络和 API Key', ok: false })
    }
  }

  const handleTestTranslator = async () => {
    setTranslatorTest({ status: '测试中...', ok: null })
    try {
      const result = await window.api.ai.testConnection({
        baseUrl: settings.ai.translator.baseUrl,
        apiKey: settings.ai.translator.apiKey
      })
      setTranslatorTest({
        status: result.ok ? '连接成功' : `连接失败: ${result.status}`,
        ok: result.ok
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
      <Button
        variant="outlined"
        size="small"
        onClick={onClick}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.15s ease',
          '&:hover': { transform: 'translateY(-1px)' }
        }}
      >
        {label}
      </Button>
      {testResult.status && (
        <Chip
          label={testResult.status}
          size="small"
          color={testResult.ok === true ? 'success' : testResult.ok === null ? 'warning' : 'error'}
          icon={testResult.ok === true ? <CheckCircle /> : undefined}
        />
      )}
    </Box>
  )

  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: 'auto', width: '100%', overflow: 'auto' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        设置
      </Typography>

      {/* ===== 外观设置 ===== */}
      <Paper elevation={0} sx={paperSx}>
        <SectionHeader icon={<TuneIcon fontSize="small" />} title="外观设置" />

        <Typography variant="body2" color="text.secondary" gutterBottom>
          主题模式
        </Typography>
        <ToggleButtonGroup
          value={settings.general.theme}
          exclusive
          onChange={(_, value) => { if (value) updateGeneral({ theme: value }) }}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value="light" sx={{ textTransform: 'none', gap: 0.5 }}>
            <LightModeIcon fontSize="small" /> 浅色
          </ToggleButton>
          <ToggleButton value="dark" sx={{ textTransform: 'none', gap: 0.5 }}>
            <DarkModeIcon fontSize="small" /> 深色
          </ToggleButton>
          <ToggleButton value="system" sx={{ textTransform: 'none', gap: 0.5 }}>
            <SettingsBrightnessIcon fontSize="small" /> 跟随系统
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* ===== 语音识别 (Whisper) 设置 ===== */}
      <Paper elevation={0} sx={paperSx}>
        <SectionHeader icon={<RecordVoiceOverIcon fontSize="small" />} title="语音识别 (Whisper)" />

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
            value={settings.ai.whisper.language || 'auto'}
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
      <Paper elevation={0} sx={paperSx}>
        <SectionHeader icon={<TranslateIcon fontSize="small" />} title="翻译引擎" />

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
      <Paper elevation={0} sx={paperSx}>
        <SectionHeader icon={<SubtitlesIcon fontSize="small" />} title="字幕设置" />

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
      <Paper elevation={0} sx={paperSx}>
        <SectionHeader icon={<HeadsetIcon fontSize="small" />} title="音频设置" />

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

      {/* 视频平台登录 */}
      <Paper elevation={0} sx={paperSx}>
        <SectionHeader icon={<LoginIcon fontSize="small" />} title="视频平台登录" />

        <Alert severity="info" sx={{ mb: 2 }}>
          部分平台视频需要登录才能访问。点击下方按钮打开登录窗口，登录成功后自动保存。
        </Alert>

        <PlatformLoginSection />
      </Paper>
    </Box>
  )
}
