import { useRef, useCallback, useState, useEffect } from 'react'
import { resampleAudio, detectVoiceActivity, pcmToWav } from '../services/audio-processor'
import { useSettingsStore } from '../store/settingsStore'

export interface AudioCaptureOptions {
  onAudioChunk: (wavBlob: Blob) => void
}

export function useAudioCapture(options: AudioCaptureOptions) {
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

    const settings = useSettingsStore.getState().settings
    const targetRate = settings.audio.sampleRate || 16000

    resampleAudio(merged, ctx.sampleRate, targetRate).then((resampled) => {
      const wavBuffer = pcmToWav(resampled, targetRate)
      const blob = new Blob([wavBuffer], { type: 'audio/wav' })
      onAudioChunkRef.current(blob)
    })
  }, [])

  const start = useCallback(async () => {
    const settings = useSettingsStore.getState().settings
    const sampleRate = settings.audio.sampleRate || 16000
    const inputDevice = settings.audio.inputDevice
    const vadSensitivity = settings.audio.vadSensitivity || 'medium'

    // Map sensitivity to dB threshold
    const vadThresholdMap = { low: -30, medium: -40, high: -50 }
    const vadThreshold = vadThresholdMap[vadSensitivity]

    try {
      // Build audio constraints
      const audioConstraints: MediaTrackConstraints = {
        sampleRate,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      }

      // Apply selected device
      if (inputDevice && inputDevice !== 'default') {
        audioConstraints.deviceId = { exact: inputDevice }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
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
        const hasVoice = detectVoiceActivity(chunk, vadThreshold)

        if (hasVoice) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
          chunkBufferRef.current.push(chunk)
          chunkDurationRef.current += (chunk.length / sampleRate) * 1000

          if (chunkDurationRef.current >= 1500) {
            flushBuffer()
          }
        } else if (chunkBufferRef.current.length > 0) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null
              flushBuffer()
            }, 500)
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
  }, [flushBuffer])

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

  return { start, stop, isCapturing }
}
