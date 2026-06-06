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

/**
 * Transcribe audio using DashScope native ASR API (paraformer-v2, etc.)
 * DashScope requires async submission + polling for results.
 */
async function dashscopeTranscribe(apiKey: string, model: string, audioData: ArrayBuffer): Promise<string> {
  const base64Audio = Buffer.from(audioData).toString('base64')

  log.debug(`[AI-IPC] DashScope ASR submit, model=${model}, audio=${audioData.byteLength}B`)

  // Step 1: Submit async task
  const submitResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable'
    },
    body: JSON.stringify({
      model,
      input: {
        file_urls: [`data:audio/wav;base64,${base64Audio}`]
      }
    })
  })

  if (!submitResponse.ok) {
    const errText = await submitResponse.text()
    log.error(`[AI-IPC] DashScope ASR submit error ${submitResponse.status}: ${errText}`)
    throw new Error(`DashScope ASR error: ${submitResponse.status} - ${errText}`)
  }

  const submitResult = await submitResponse.json() as any
  const taskId = submitResult.output?.task_id
  if (!taskId) {
    throw new Error(`DashScope ASR: no task_id in response: ${JSON.stringify(submitResult)}`)
  }

  log.debug(`[AI-IPC] DashScope ASR task_id=${taskId}, polling...`)

  // Step 2: Poll for result (max 60 seconds)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000))

    const pollResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })

    if (!pollResponse.ok) {
      const errText = await pollResponse.text()
      throw new Error(`DashScope ASR poll error: ${pollResponse.status} - ${errText}`)
    }

    const pollResult = await pollResponse.json() as any
    const status = pollResult.output?.task_status

    if (status === 'SUCCEEDED') {
      // DashScope returns a transcription_url — need to fetch the actual result
      const transcriptionUrl = pollResult.output?.results?.[0]?.transcription_url
      if (!transcriptionUrl) {
        throw new Error(`DashScope ASR: no transcription_url in result: ${JSON.stringify(pollResult.output)}`)
      }

      log.debug(`[AI-IPC] DashScope ASR fetching transcription from URL...`)
      const transcriptionResponse = await fetch(transcriptionUrl)
      if (!transcriptionResponse.ok) {
        throw new Error(`DashScope ASR fetch transcription error: ${transcriptionResponse.status}`)
      }

      const transcriptionResult = await transcriptionResponse.json() as any
      const transcripts = transcriptionResult.transcripts || []
      const text = transcripts.map((t: any) => t.text).join(' ').trim()
      log.debug(`[AI-IPC] DashScope ASR result: "${text.substring(0, 100)}"`)
      return text
    } else if (status === 'FAILED') {
      throw new Error(`DashScope ASR task failed: ${JSON.stringify(pollResult.output)}`)
    }

    // Still PENDING or RUNNING, continue polling
  }

  throw new Error('DashScope ASR timeout: task did not complete within 60 seconds')
}

/**
 * Transcribe audio using OpenAI-compatible Whisper API
 */
async function openaiTranscribe(baseUrl: string, apiKey: string, model: string, language: string, audioData: ArrayBuffer): Promise<string> {
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
  return text.trim()
}

export function registerAiIpc(): void {
  // Whisper 语音转写 (supports both DashScope native and OpenAI-compatible APIs)
  ipcMain.handle(
    IPC_CHANNELS.AI_WHISPER_TRANSCRIBE,
    async (_event, config: {
      baseUrl: string; apiKey: string; model: string; language: string;
      audioData: ArrayBuffer;
    }) => {
      const { baseUrl, apiKey, model, language, audioData } = config

      // Detect DashScope and use native ASR API
      const isDashScope = baseUrl.includes('dashscope.aliyuncs.com')

      const text = isDashScope
        ? await dashscopeTranscribe(apiKey, model, audioData)
        : await openaiTranscribe(baseUrl, apiKey, model, language, audioData)

      return { text }
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
      const modelsUrl = `${baseUrl}/v1/models`

      log.debug(`[AI-IPC] Test connection GET ${modelsUrl}`)

      try {
        // 先尝试标准 /v1/models 端点（OpenAI/DeepSeek 等支持）
        const response = await fetch(modelsUrl, {
          headers: { Authorization: `Bearer ${apiKey}` }
        })

        if (response.ok) {
          return { ok: true, status: response.status, statusText: response.statusText }
        }

        // 401 说明 key 确实无效，直接返回
        if (response.status === 401) {
          return { ok: false, status: 401, statusText: 'API Key 无效' }
        }

        // 其他错误（404/405等）说明 /v1/models 不受支持（如百炼DashScope兼容模式）
        // 改用最轻量的 POST 请求验证 key 有效性
        log.debug(`[AI-IPC] /v1/models returned ${response.status}, trying POST to verify key`)
        const postUrl = `${baseUrl}/v1/chat/completions`
        const postResponse = await fetch(postUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'qwen-turbo',
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 1,
            stream: false
          })
        })

        // 401/403 = key 无效；其他状态码（包括正常200或模型错误）= key 有效
        if (postResponse.status === 401 || postResponse.status === 403) {
          return { ok: false, status: postResponse.status, statusText: 'API Key 无效' }
        }

        log.debug(`[AI-IPC] POST verify passed: ${postResponse.status}`)
        return { ok: true, status: postResponse.status, statusText: '连接成功' }
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
