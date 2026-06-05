// ===== 音频输入模式 =====
export type InputMode = 'url' | 'system-audio' | 'microphone';

// ===== 应用状态 =====
export type AppStatus = 'idle' | 'connecting' | 'listening' | 'translating' | 'error';

// ===== 字幕条目 =====
export interface SubtitleEntry {
  id: string;
  timestamp: number;
  originalText: string;
  translatedText: string;
  isFinal: boolean;
  correctedFrom?: string;
  mode: InputMode;
}

// ===== 翻译会话 =====
export interface TranslationSession {
  id: string;
  mode: InputMode;
  sourceUrl?: string;
  sourceLanguage: string;
  targetLanguage: string;
  startTime: number;
  endTime?: number;
  subtitles: SubtitleEntry[];
  summary?: string;
}

// ===== AI 引擎配置 =====
export interface AIEngineConfig {
  whisper: {
    provider: 'openai';
    apiKey: string;
    model: string;
    language?: string;
  };
  translator: {
    provider: 'deepseek';
    apiKey: string;
    model: string;
    baseUrl: string;
  };
}

// ===== 字幕显示设置 =====
export interface SubtitleSettings {
  fontSize: number;
  originalColor: string;
  translatedColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  maxLines: number;
}

// ===== 音频设置 =====
export interface AudioSettings {
  inputDevice: string;
  vadSensitivity: 'low' | 'medium' | 'high';
  sampleRate: number;
}

// ===== 通用设置 =====
export interface GeneralSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
}

// ===== 应用设置 =====
export interface AppSettings {
  ai: AIEngineConfig;
  subtitle: SubtitleSettings;
  audio: AudioSettings;
  general: GeneralSettings;
}

// ===== 默认设置 =====
export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    whisper: {
      provider: 'openai',
      apiKey: '',
      model: 'whisper-1',
    },
    translator: {
      provider: 'deepseek',
      apiKey: '',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com',
    },
  },
  subtitle: {
    fontSize: 16,
    originalColor: '#ffffff',
    translatedColor: '#ffd54f',
    backgroundColor: '#000000',
    backgroundOpacity: 0.8,
    maxLines: 10,
  },
  audio: {
    inputDevice: 'default',
    vadSensitivity: 'medium',
    sampleRate: 16000,
  },
  general: {
    theme: 'dark',
    language: 'zh-CN',
  },
};
