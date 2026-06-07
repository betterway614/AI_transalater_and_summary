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

// ===== 视频信息 =====
export interface VideoPart {
  index: number;
  title: string;
  duration: number;
}

export interface VideoInfo {
  title: string;
  duration: number;
  uploader: string;
  partCount: number;
  parts: VideoPart[];
  siteName: string;
}
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
    provider: string;
    apiKey: string;
    model: string;
    baseUrl: string;
    language?: string;
  };
  translator: {
    provider: string;
    apiKey: string;
    model: string;
    baseUrl: string;
  };
}

// ===== 字幕显示设置 =====
export type SubtitleDisplayMode = 'bilingual' | 'chinese-only';

export interface SubtitleSettings {
  fontSize: number;
  originalColor: string;
  translatedColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  maxLines: number;
  displayMode: SubtitleDisplayMode;
}

// ===== 音频设置 =====
export interface AudioSettings {
  inputDevice: string;
  vadSensitivity: 'low' | 'medium' | 'high';
  sampleRate: number;
}

// ===== AI 总结模板 =====
export interface SummaryTemplate {
  id: string
  name: string
  icon: string
  systemPrompt: string
  userMessageTemplate: string
  isBuiltIn: boolean
}

export const BUILT_IN_TEMPLATES: SummaryTemplate[] = [
  {
    id: 'general',
    name: '通用思维导图',
    icon: 'AccountTreeIcon',
    systemPrompt: `你是一位专业的知识整理与会议记录分析师。

你的任务是将翻译后的演讲/会议/课程内容整理为结构化的思维导图大纲。

输出规范：
- 严格使用 Markdown 标题层级格式
- 一级标题（#）：仅 1 个，为整个内容的主题
- 二级标题（##）：3-7 个主要议题/章节
- 三级标题（###）：每个议题下的 2-5 个关键要点
- 四级列表（-）：补充细节、数据、例子

内容要求：
- 语言统一为中文
- 相似内容合并，避免重复
- 保持逻辑顺序（按内容时间线或主题分组）
- 每个节点文字精炼，适合在思维导图节点中显示（不超过 20 字为佳）
- 去除口语化重复和无意义语气词
- 保留关键数据、人名、专业术语`,
    userMessageTemplate: '请对以下内容生成结构化的思维导图大纲：\n\n{{content}}',
    isBuiltIn: true,
  },
  {
    id: 'meeting',
    name: '会议纪要',
    icon: 'GroupsIcon',
    systemPrompt: `你是一位专业的会议记录员。你的任务是将会议语音转写整理为结构化的会议纪要。

输出规范：
- 一级标题（#）：会议名称/主题
- 二级标题（##）：会议核心议题（按议程顺序）
- 三级标题（###）：每个议题下的讨论要点
- 四级列表（-）：具体发言、数据、分歧点
- 在末尾用 ## 添加"决议与行动项"章节，列出已达成决议和待办事项（含负责人和截止时间，如提及）

内容要求：
- 统一使用中文
- 突出决议和行动项，不可遗漏
- 标注未达成共识的争议点
- 去除寒暄和无关闲聊
- 保留关键数字、承诺和 deadline`,
    userMessageTemplate: '请将以下会议内容整理为会议纪要，突出决议和行动项：\n\n{{content}}',
    isBuiltIn: true,
  },
  {
    id: 'lecture',
    name: '课程笔记',
    icon: 'SchoolIcon',
    systemPrompt: `你是一位专业的学习笔记整理师。你的任务是将课程或讲座的语音转写整理为结构化学习笔记。

输出规范：
- 一级标题（#）：课程/讲座标题
- 二级标题（##）：知识模块/章节（按讲授顺序）
- 三级标题（###）：核心概念和定义
- 四级列表（-）：公式、例题、案例、补充说明
- 在末尾用 ## 添加"关键概念索引"，列出本节课涉及的所有重要术语及其一句话解释

内容要求：
- 统一使用中文
- 保持知识体系的层级和逻辑关系
- 准确定义概念，不可曲解原文
- 标注讲师强调的重点（可在行末用 ⭐）
- 补充型内容（举例、轶事）适当精简但保留
- 专业术语保留原文并附中文翻译`,
    userMessageTemplate: '请将以下课程/讲座内容整理为结构化学习笔记：\n\n{{content}}',
    isBuiltIn: true,
  },
  {
    id: 'interview',
    name: '访谈记录',
    icon: 'RecordVoiceOverIcon',
    systemPrompt: `你是一位专业的访谈记录编辑。你的任务是将访谈对话的语音转写整理为结构化的访谈摘要。

输出规范：
- 一级标题（#）：访谈主题
- 二级标题（##）：访谈涉及的核心话题
- 三级标题（###）：每个话题下的核心观点
- 四级列表（-）：关键引用（尽量保留原话）、数据、案例
- 在末尾用 ## 添加"关键观点摘要"，用 3-5 句话概括受访者的核心立场

内容要求：
- 统一使用中文
- 以受访者观点为主线，采访者提问作为结构线索
- 保留受访者的独特表达和关键原话
- 区分事实陈述和个人观点
- 标注受访者情绪或态度明显的时刻（如强调、迟疑）
- 去除口语填充词但保留表达风格`,
    userMessageTemplate: '请将以下访谈对话整理为结构化访谈摘要，突出受访者的核心观点和关键引用：\n\n{{content}}',
    isBuiltIn: true,
  },
]

// ===== 通用设置 =====
export interface GeneralSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  summaryPrompt: string
  summaryTemplates: SummaryTemplate[]
  activeTemplateId: string
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
      baseUrl: 'https://api.openai.com',
    },
    translator: {
      provider: 'deepseek',
      apiKey: '',
      model: 'deepseek-v4-flash',
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
    displayMode: 'bilingual',
  },
  audio: {
    inputDevice: 'default',
    vadSensitivity: 'medium',
    sampleRate: 16000,
  },
  general: {
    theme: 'dark',
    language: 'zh-CN',
    summaryPrompt: '',
    summaryTemplates: [],
    activeTemplateId: '',
  },
};
