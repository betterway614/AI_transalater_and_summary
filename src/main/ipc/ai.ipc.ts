import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import log from 'electron-log'

function extractTextFromStreamLines(lines: string[]): { text: string; done: boolean } {
  let text = ''
  let done = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('data: ')) continue
    const data = trimmed.slice(6)
    if (data === '[DONE]') {
      done = true
      continue
    }
    try {
      const json = JSON.parse(data)
      const delta = json.choices?.[0]?.delta?.content
      if (delta) text += delta
    } catch { /* skip malformed */ }
  }
  return { text, done }
}

export function registerAiIpc(): void {
  // Whisper 语音转写
  ipcMain.handle(
    IPC_CHANNELS.AI_WHISPER_TRANSCRIBE,
    async (_event, config: {
      baseUrl: string; apiKey: string; model: string; language: string;
      audioData: ArrayBuffer;
    }) => {
      const { baseUrl, apiKey, model, language, audioData } = config
      const url = `${baseUrl}/v1/audio/transcriptions`

      const formData = new FormData()
      formData.append('file', new Blob([audioData], { type: 'audio/wav' }), 'audio.wav')
      formData.append('model', model)
      formData.append('response_format', 'text')
      if (language && language !== 'auto') {
        formData.append('language', language)
      }

      log.debug(`[AI-IPC] Whisper POST ${url}, audio=${audioData.byteLength}B, model=${model}`)

      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        log.error(`[AI-IPC] Whisper error ${response.status}: ${errorText}`)
        throw new Error(`Whisper API error: ${response.status} - ${errorText}`)
      }

      const text = await response.text()
      log.debug(`[AI-IPC] Whisper response: "${text.trim().substring(0, 100)}"`)
      return { text: text.trim() }
    }
  )

  // Chat Completions（翻译/摘要，流式请求在主进程内收集完成后返回）
  ipcMain.handle(
    IPC_CHANNELS.AI_CHAT_COMPLETION,
    async (_event, config: {
      baseUrl: string; apiKey: string; model: string; messages: Array<{ role: string; content: string }>;
      temperature?: number; maxTokens?: number;
    }) => {
      const { baseUrl, apiKey, model, messages, temperature, maxTokens } = config
      const url = `${baseUrl}/v1/chat/completions`

      log.debug(`[AI-IPC] Chat POST ${url}, model=${model}, messages=${messages.length}`)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: temperature ?? 0.3,
          max_tokens: maxTokens ?? 1024
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        log.error(`[AI-IPC] Chat error ${response.status}: ${errorText}`)
        throw new Error(`Chat API error: ${response.status} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let accumulated = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        const { text, done: streamDone } = extractTextFromStreamLines(lines)
        accumulated += text
        if (streamDone) break
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const { text } = extractTextFromStreamLines([buffer])
        accumulated += text
      }

      log.debug(`[AI-IPC] Chat response: "${accumulated.substring(0, 100)}"`)
      return { text: accumulated }
    }
  )

  // 测试 API 连接
  ipcMain.handle(
    IPC_CHANNELS.AI_TEST_CONNECTION,
    async (_event, config: { baseUrl: string; apiKey: string }) => {
      const { baseUrl, apiKey } = config
      const url = `${baseUrl}/v1/models`

      log.debug(`[AI-IPC] Test connection GET ${url}`)

      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` }
        })
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        }
      } catch (err) {
        log.error(`[AI-IPC] Test connection failed:`, err)
        return {
          ok: false,
          status: 0,
          statusText: String(err)
        }
      }
    }
  )

  log.info('[AI-IPC] Registered')
}
