import { useRef, useCallback, useState } from 'react'
import { resampleAudio, detectVoiceActivity, pcmToWav } from '../services/audio-processor'

export interface AudioCaptureOptions {
  sampleRate?: number
  vadEnabled?: boolean
  vadThreshold?: number
  chunkDurationMs?: number
  onAudioChunk: (wavBlob: Blob) => void
}

export function useAudioCapture(options: AudioCaptureOptions) {
  const {
    sampleRate = 16000,
    vadEnabled = true,
    vadThreshold = -40,
    chunkDurationMs = 3000,
    onAudioChunk
  } = options

  const [isCapturing, setIsCapturing] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const chunkBufferRef = useRef<Float32Array[]>([])
  const chunkDurationRef = useRef(0)

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
        const inputData = e.inputBuffer.getChannelData(0)
        const chunk = new Float32Array(inputData)

        if (vadEnabled && !detectVoiceActivity(chunk, vadThreshold)) {
          return // Skip silent chunks
        }

        chunkBufferRef.current.push(chunk)
        chunkDurationRef.current += (chunk.length / sampleRate) * 1000

        // When we have enough audio, send it
        if (chunkDurationRef.current >= chunkDurationMs) {
          const totalLength = chunkBufferRef.current.reduce((sum, c) => sum + c.length, 0)
          const merged = new Float32Array(totalLength)
          let offset = 0
          for (const c of chunkBufferRef.current) {
            merged.set(c, offset)
            offset += c.length
          }

          resampleAudio(merged, ctx.sampleRate, sampleRate).then((resampled) => {
            const wavBuffer = pcmToWav(resampled, sampleRate)
            const blob = new Blob([wavBuffer], { type: 'audio/wav' })
            onAudioChunk(blob)
          })

          chunkBufferRef.current = []
          chunkDurationRef.current = 0
        }
      }

      source.connect(processor)
      processor.connect(ctx.destination)
      setIsCapturing(true)
    } catch (err) {
      console.error('Failed to start audio capture:', err)
      throw err
    }
  }, [sampleRate, vadEnabled, vadThreshold, chunkDurationMs, onAudioChunk])

  const stop = useCallback(() => {
    processorRef.current?.disconnect()
    contextRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())

    processorRef.current = null
    contextRef.current = null
    streamRef.current = null
    chunkBufferRef.current = []
    chunkDurationRef.current = 0
    setIsCapturing(false)
  }, [])

  return { start, stop, isCapturing }
}
