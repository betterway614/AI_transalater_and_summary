export const IPC_CHANNELS = {
  // yt-dlp
  YTDLP_EXTRACT_AUDIO: 'ytdlp:extract-audio',
  YTDLP_GET_INFO: 'ytdlp:get-info',
  YTDLP_CANCEL: 'ytdlp:cancel',
  YTDLP_PROGRESS: 'ytdlp:progress',

  // 系统音频
  SYSTEM_AUDIO_START: 'system-audio:start',
  SYSTEM_AUDIO_STOP: 'system-audio:stop',
  SYSTEM_AUDIO_DATA: 'system-audio:data',
  SYSTEM_AUDIO_DEVICES: 'system-audio:devices',

  // 存储
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',

  // 导出
  EXPORT_MARKDOWN: 'export:markdown',
  EXPORT_DIALOG: 'export:dialog',

  // 窗口控制
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
