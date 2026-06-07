export const IPC_CHANNELS = {
  // yt-dlp
  YTDLP_EXTRACT_AUDIO: 'ytdlp:extract-audio',
  YTDLP_GET_INFO: 'ytdlp:get-info',
  YTDLP_CANCEL: 'ytdlp:cancel',
  YTDLP_PROGRESS: 'ytdlp:progress',
  YTDLP_SET_COOKIES: 'ytdlp:set-cookies',

  // 认证
  AUTH_LOGIN: 'auth:login',
  AUTH_GET_LOGGED_IN: 'auth:get-logged-in',
  AUTH_GET_COOKIES: 'auth:get-cookies',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_DETECT_PLATFORM: 'auth:detect-platform',
  AUTH_GET_PLATFORMS: 'auth:get-platforms',

  // 系统音频
  SYSTEM_AUDIO_START: 'system-audio:start',
  SYSTEM_AUDIO_STOP: 'system-audio:stop',
  SYSTEM_AUDIO_DATA: 'system-audio:data',
  SYSTEM_AUDIO_ERROR: 'system-audio:error',
  SYSTEM_AUDIO_DEVICES: 'system-audio:devices',
  SYSTEM_AUDIO_GET_SCREEN_SOURCE: 'system-audio:get-screen-source',

  // 存储
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_GET_SECRET: 'store:get-secret',
  STORE_SET_SECRET: 'store:set-secret',
  STORE_GET_STATS: 'store:get-stats',
  STORE_CLEANUP: 'store:cleanup',

  // 导出
  EXPORT_MARKDOWN: 'export:markdown',
  EXPORT_DIALOG: 'export:dialog',

  // 窗口控制
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',

  // 浮动字幕窗口
  FLOATING_SHOW: 'floating:show',
  FLOATING_HIDE: 'floating:hide',
  FLOATING_SET_EXPANDED: 'floating:set-expanded',
  FLOATING_UPDATE_SUBTITLES: 'floating:update-subtitles',
  FLOATING_UPDATE_THEME: 'floating:update-theme',
  FLOATING_UPDATE_SUMMARY: 'floating:update-summary',
  FLOATING_SUBTITLES_FROM_RENDERER: 'floating:subtitles-from-renderer',
  FLOATING_THEME_FROM_RENDERER: 'floating:theme-from-renderer',
  FLOATING_SUMMARY_FROM_RENDERER: 'floating:summary-from-renderer',
  FLOATING_SUBTITLE_SETTINGS_FROM_RENDERER: 'floating:subtitle-settings-from-renderer',
  FLOATING_UPDATE_SUBTITLE_SETTINGS: 'floating:update-subtitle-settings',
  FLOATING_SET_DISPLAY_MODE: 'floating:set-display-mode',
  FLOATING_DISPLAY_MODE_CHANGED: 'floating:display-mode-changed',

  // AI API 代理（主进程中转，避免 CORS）
  AI_WHISPER_TRANSCRIBE: 'ai:whisper-transcribe',
  AI_CHAT_COMPLETION: 'ai:chat-completion',
  AI_CHAT_COMPLETION_STREAM_CHUNK: 'ai:chat-completion-stream-chunk',
  AI_TEST_CONNECTION: 'ai:test-connection',

  // 渲染进程日志 -> 主进程终端
  RENDERER_LOG: 'renderer:log',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
