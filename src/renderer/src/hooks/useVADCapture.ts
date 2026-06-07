import { useRef, useCallback, useState, useEffect } from 'react'
import { resampleAudio, detectVoiceActivity, pcmToWav } from '../services/audio-processor'
import { useSettingsStore } from '../store/settingsStore'
import { useAppStore } from '../store/appStore'

const log = (...args: unknown[]) => { console.log(...args); window.api?.logToMain('info', ...args) }
const logErr = (...args: unknown[]) => { console.error(...args); window.api?.logToMain('error', ...args) }

export interface VADCaptureOptions {
  onAudioChunk: (wavBlob: Blob) => void
  /** Label used in debug logs to distinguish capture sources */
  label: string
}

/**
 * Shared VAD-based audio capture hook.
 * Captures from a user-provided MediaStream, applies voice activity detection,
 * and emits WAV blobs for speech segments.
 *
 * The only difference between microphone and system audio capture is how the
 * MediaStream is obtained — this hook accepts the stream directly.
 */
export function useVADCapture(options: VADCaptureOptions) {
  const { onAudioChunk, label } = options

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
  const audioLevelRef = useRef(0)

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
      log(`[${label}] flushBuffer -> WAV blob: ${blob.size} bytes, resampled: ${resampled.length} samples`)
      onAudioChunkRef.current(blob)
    }).catch((err) => {
      logErr(`[${label}] Resample error:`, err)
    })
  }, [label])

  /**
   * Start capturing from the given MediaStream.
   * Callers are responsible for obtaining the stream (getUserMedia, getDisplayMedia, etc.)
   */
  const start = useCallback(async (stream: MediaStream) => {
    log(`[${label}] ====== start() called ======`)
    const settings = useSettingsStore.getState().settings
    const sampleRate = settings.audio.sampleRate || 16000
    sampleRateRef.current = sampleRate
    const vadSensitivity = settings.audio.vadSensitivity || 'medium'

    const vadThresholdMap: Record<string, number> = { low: -30, medium: -40, high: -50 }
    const vadThreshold = vadThresholdMap[vadSensitivity]

    try {
      streamRef.current = stream

      const ctx = new AudioContext({ sampleRate })
      contextRef.current = ctx
      log(`[${label}] AudioContext created, sampleRate:`, ctx.sampleRate)

      const source = ctx.createMediaStreamSource(stream)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      let processCount = 0
      processor.onaudioprocess = (e) => {
        if (!isCapturingRef.current) return
        processCount++

        const inputData = e.inputBuffer.getChannelData(0)
        const chunk = new Float32Array(inputData)

        let rms = 0
        for (let i = 0; i < chunk.length; i++) rms += chunk[i] * chunk[i]
        rms = Math.sqrt(rms / chunk.length)
        const db = 20 * Math.log10(rms + 1e-10)
        audioLevelRef.current = db

        const hasVoice = detectVoiceActivity(chunk, vadThreshold)

        if (processCount <= 10 || processCount % 100 === 0) {
          log(`[${label}] #${processCount} rms=${rms.toFixed(6)} db=${db.toFixed(1)} thresh=${vadThreshold} voice=${hasVoice} buf=${chunkBufferRef.current.length} dur=${chunkDurationRef.current.toFixed(0)}ms`)
        }

        if (hasVoice) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
          chunkBufferRef.current.push(chunk)
          chunkDurationRef.current += (chunk.length / ctx.sampleRate) * 1000

          if (chunkDurationRef.current >= 5000) {
            log(`[${label}] Flushing: dur=${chunkDurationRef.current.toFixed(0)}ms, chunks=${chunkBufferRef.current.length}`)
            flushBuffer()
          }
        } else if (chunkBufferRef.current.length > 0) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null
              if (chunkDurationRef.current < 250) {
                log(`[${label}] Dropping short fragment: dur=${chunkDurationRef.current.toFixed(0)}ms`)
                chunkBufferRef.current = []
                chunkDurationRef.current = 0
                return
              }
              log(`[${label}] Silence flush: chunks=${chunkBufferRef.current.length} dur=${chunkDurationRef.current.toFixed(0)}ms`)
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
      log(`[${label}] Capture started successfully`)
    } catch (err) {
      logErr(`[${label}] Failed to start:`, err)
      throw err
    }
  }, [flushBuffer, label])

  const stop = useCallback(() => {
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

  return { start, stop, isCapturing, audioLevelRef }
}
