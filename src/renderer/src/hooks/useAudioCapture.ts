import { useRef, useCallback, useState, useEffect } from 'react'
import { resampleAudio, detectVoiceActivity, pcmToWav } from '../services/audio-processor'

export interface AudioCaptureOptions {
  sampleRate?: number
  vadEnabled?: boolean
  vadThreshold?: number
  chunkDurationMs?: number
  silenceFlushMs?: number
  onAudioChunk: (wavBlob: Blob) => void
}

export function useAudioCapture(options: AudioCaptureOptions) {
  const {
    sampleRate = 16000,
    vadEnabled = true,
    vadThreshold = -40,
    chunkDurationMs = 1500,
    silenceFlushMs = 500,
    onAudioChunk
  } = options

  const [isCapturing, setIsCapturing] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const chunkBufferRef = useRef<Float32Array[]>([])
  const chunkDurationRef = useRef(0)
  const lastVoiceTimeRef = useRef(0)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onAudioChunkRef = useRef(onAudioChunk)
  const isCapturingRef = useRef(false)

  // Keep callback ref current
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

    // Process async without blocking
    resampleAudio(merged, ctx.sampleRate, sampleRate).then((resampled) => {
      const wavBuffer = pcmToWav(resampled, sampleRate)
      const blob = new Blob([wavBuffer], { type: 'audio/wav' })
      onAudioChunkRef.current(blob)
    })
  }, [sampleRate])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      streamRef.current = stream
      const ctx = new AudioContext({ sampleRate })
      contextRef.current = ctx

      const source = ctx.createMediaStreamSource(stream)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (!isCapturingRef.current) return

        const inputData = e.inputBuffer.getChannelData(0)
        const chunk = new Float32Array(inputData)

        const hasVoice = vadEnabled ? detectVoiceActivity(chunk, vadThreshold) : true

        if (hasVoice) {
          lastVoiceTimeRef.current = Date.now()

          // Clear pending silence flush
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }

          chunkBufferRef.current.push(chunk)
          chunkDurationRef.current += (chunk.length / sampleRate) * 1000

          // Flush when chunk duration reached
          if (chunkDurationRef.current >= chunkDurationMs) {
            flushBuffer()
          }
        } else if (chunkBufferRef.current.length > 0) {
          // Voice stopped with pending audio — start silence timer
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null
              flushBuffer()
            }, silenceFlushMs)
          }
        }
      }

      source.connect(processor)
      processor.connect(ctx.destination)
      isCapturingRef.current = true
      setIsCapturing(true)
    } catch (err) {
      console.error('Failed to start audio capture:', err)
      throw err
    }
  }, [sampleRate, vadEnabled, vadThreshold, chunkDurationMs, silenceFlushMs, flushBuffer])

  const stop = useCallback(() => {
    isCapturingRef.current = false
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    // Flush any remaining audio
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

  return { start, stop, isCapturing }
}
