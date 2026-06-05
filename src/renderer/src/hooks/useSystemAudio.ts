import { useRef, useCallback, useState, useEffect } from 'react'
import { resampleAudio, detectVoiceActivity, pcmToWav } from '../services/audio-processor'
import { useSettingsStore } from '../store/settingsStore'
import { useAppStore } from '../store/appStore'

// Dual logger: console + terminal (via IPC)，确保无论哪个 DevTools 开着都能看到
const log = (...args: unknown[]) => {
  console.log(...args)
  window.api?.logToMain('info', ...args)
}
const logErr = (...args: unknown[]) => {
  console.error(...args)
  window.api?.logToMain('error', ...args)
}

export interface SystemAudioOptions {
  onAudioChunk: (wavBlob: Blob) => void
}

/**
 * System audio capture using getDisplayMedia() + main-process setDisplayMediaRequestHandler.
 * The main process auto-approves via setDisplayMediaRequestHandler with useSystemPicker: false,
 * providing screen source + audio: 'loopback' for system audio capture.
 */
export function useSystemAudioCapture(options: SystemAudioOptions) {
  const { onAudioChunk } = options

  const [isCapturing, setIsCapturing] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const chunkBufferRef = useRef<Float32Array[]>([])
  const chunkDurationRef = useRef(0)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onAudioChunkRef = useRef(onAudioChunk)
  const isCapturingRef = useRef(false)
  const sampleRateRef = useRef(16000)

  useEffect(() => {
    onAudioChunkRef.current = onAudioChunk
  }, [onAudioChunk])

  const flushBuffer = useCallback(() => {
    if (chunkBufferRef.current.length === 0) return
    const ctx = contextRef.current
    if (!ctx) return

    const totalLength = chunkBufferRef.current.reduce((sum, c) => sum + c.length, 0)
    const merged = new Float32Array(totalLength)
    let offset = 0
    for (const c of chunkBufferRef.current) {
      merged.set(c, offset)
      offset += c.length
    }

    chunkBufferRef.current = []
    chunkDurationRef.current = 0

    const targetRate = sampleRateRef.current

    resampleAudio(merged, ctx.sampleRate, targetRate).then((resampled) => {
      const wavBuffer = pcmToWav(resampled, targetRate)
      const blob = new Blob([wavBuffer], { type: 'audio/wav' })
      log(`[SysAudio] flushBuffer -> WAV blob: ${blob.size} bytes, ${resampled.length} samples`)
      onAudioChunkRef.current(blob)
    }).catch((err) => {
      logErr('[SysAudio] Resample error:', err)
    })
  }, [])

  const start = useCallback(async () => {
    log('[SysAudio] ====== start() called ======')
    const settings = useSettingsStore.getState().settings
    const sampleRate = settings.audio.sampleRate || 16000
    sampleRateRef.current = sampleRate
    const vadSensitivity = settings.audio.vadSensitivity || 'medium'

    const vadThresholdMap: Record<string, number> = { low: -30, medium: -40, high: -50 }
    const vadThreshold = vadThresholdMap[vadSensitivity]

    try {
      // Use getDisplayMedia() — the modern API for screen + system audio capture.
      // Main process setDisplayMediaRequestHandler auto-approves with useSystemPicker: false,
      // returning { video: source, audio: 'loopback' }.
      log('[SysAudio] Calling getDisplayMedia({ video: true, audio: true })...')

      // Race with a timeout — getDisplayMedia can hang if window loses focus
      const gdmPromise = navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      } as any)

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('getDisplayMedia 超时 (15s)，窗口可能失去焦点')), 15000)
      )

      let stream: MediaStream
      try {
        stream = await Promise.race([gdmPromise, timeoutPromise])
        log('[SysAudio] getDisplayMedia SUCCESS, video tracks:', stream.getVideoTracks().length, 'audio tracks:', stream.getAudioTracks().length)
      } catch (e: any) {
        logErr(`[SysAudio] getDisplayMedia FAILED: ${e.name}: ${e.message}`, e)
        throw e
      }

      // Discard video tracks — we only need audio
      stream.getVideoTracks().forEach((t) => {
        t.stop()
        stream.removeTrack(t)
      })

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop())
        throw new Error('无法获取系统音频流，请检查系统音频输出设备')
      }

      const audioTrack = audioTracks[0]
      log('[SysAudio] Audio track:', audioTrack.label, 'settings:', JSON.stringify(audioTrack.getSettings()))
      streamRef.current = stream

      const ctx = new AudioContext({ sampleRate })
      contextRef.current = ctx
      log('[SysAudio] AudioContext created, actual sampleRate:', ctx.sampleRate, 'target:', sampleRate)

      const source = ctx.createMediaStreamSource(stream)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      let processCount = 0
      let voiceCount = 0
      processor.onaudioprocess = (e) => {
        if (!isCapturingRef.current) return
        processCount++

        const inputData = e.inputBuffer.getChannelData(0)
        const chunk = new Float32Array(inputData)

        let rms = 0
        for (let i = 0; i < chunk.length; i++) rms += chunk[i] * chunk[i]
        rms = Math.sqrt(rms / chunk.length)
        const db = 20 * Math.log10(rms + 1e-10)

        const hasVoice = detectVoiceActivity(chunk, vadThreshold)

        if (processCount <= 10 || processCount % 100 === 0) {
          log(`[SysAudio] #${processCount} rms=${rms.toFixed(6)} db=${db.toFixed(1)} thresh=${vadThreshold} voice=${hasVoice} buf=${chunkBufferRef.current.length} dur=${chunkDurationRef.current.toFixed(0)}ms`)
        }

        if (hasVoice) {
          voiceCount++
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
          chunkBufferRef.current.push(chunk)
          chunkDurationRef.current += (chunk.length / ctx.sampleRate) * 1000

          if (chunkDurationRef.current >= 1500) {
            log(`[SysAudio] Flushing: dur=${chunkDurationRef.current.toFixed(0)}ms, chunks=${chunkBufferRef.current.length}, voices=${voiceCount}`)
            flushBuffer()
          }
        } else if (chunkBufferRef.current.length > 0) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null
              log(`[SysAudio] Silence flush: chunks=${chunkBufferRef.current.length}`)
              flushBuffer()
            }, 500)
          }
        }
      }

      source.connect(processor)
      processor.connect(ctx.destination)
      isCapturingRef.current = true
      setIsCapturing(true)
      useAppStore.getState().setStatus('listening')
      log('[SysAudio] Capture started successfully')
    } catch (err: any) {
      logErr('[SysAudio] Failed to start:', err)
      useAppStore.getState().setStatus('error')
      throw err
    }
  }, [flushBuffer])

  const stop = useCallback(() => {
    log('[SysAudio] stop() called')
    isCapturingRef.current = false
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    flushBuffer()
    processorRef.current?.disconnect()
    contextRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    processorRef.current = null
    contextRef.current = null
    streamRef.current = null
    chunkBufferRef.current = []
    chunkDurationRef.current = 0
    setIsCapturing(false)
  }, [flushBuffer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCapturingRef.current) {
        isCapturingRef.current = false
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        processorRef.current?.disconnect()
        contextRef.current?.close()
        streamRef.current?.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  return { start, stop, isCapturing }
}
