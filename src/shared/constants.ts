export const APP_NAME = 'VoiceBridge · 语桥';
export const APP_VERSION = '0.1.0';

// 音频常量
export const SAMPLE_RATE = 16000;
export const AUDIO_CHUNK_DURATION_MS = 1500;  // 优化: 从3000降到1500减少延迟
export const VAD_SILENCE_FLUSH_MS = 500;      // VAD尾部静音刷新超时
export const VAD_DEFAULT_THRESHOLD_DB = -40;

// API 重试
export const API_MAX_RETRIES = 2;
export const API_RETRY_DELAY_MS = 1000;

// 字幕
export const MAX_SUBTITLE_CONTEXT = 3;
export const DEFAULT_MAX_LINES = 10;

// ===== API 预设配置 =====
export interface APIPreset {
  label: string;
  baseUrl: string;
  models: string[];
}

export const WHISPER_PRESETS: APIPreset[] = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com', models: ['whisper-1'] },
  { label: '百炼大模型', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode', models: ['paraformer-v2', 'paraformer-realtime-v2'] },
  { label: '自定义', baseUrl: '', models: [] }
];

export const TRANSLATOR_PRESETS: APIPreset[] = [
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: ['deepseek-v4-flash', 'deepseek-v4-pro'] },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { label: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode', models: ['qwen-plus', 'qwen-turbo', 'qwen-max'] },
  { label: '月之暗面', baseUrl: 'https://api.moonshot.cn', models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] },
  { label: '智谱 AI', baseUrl: 'https://open.bigmodel.cn/api/paas', models: ['glm-4-flash', 'glm-4', 'glm-4-plus'] },
  { label: '自定义', baseUrl: '', models: [] }
];

export const WHISPER_LANGUAGES = [
  { code: 'auto', label: '自动检测' },
  { code: 'en', label: '英语 (English)' },
  { code: 'zh', label: '中文 (Chinese)' },
  { code: 'ja', label: '日语 (Japanese)' },
  { code: 'ko', label: '韩语 (Korean)' },
  { code: 'fr', label: '法语 (French)' },
  { code: 'de', label: '德语 (German)' },
  { code: 'es', label: '西班牙语 (Spanish)' },
  { code: 'ru', label: '俄语 (Russian)' },
  { code: 'pt', label: '葡萄牙语 (Portuguese)' },
  { code: 'ar', label: '阿拉伯语 (Arabic)' }
];
