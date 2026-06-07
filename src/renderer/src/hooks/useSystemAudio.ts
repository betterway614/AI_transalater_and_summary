import { useRef, useCallback, useState, useEffect } from 'react'
import { resampleAudio, detectVoiceActivity, pcmToWav } from '../services/audio-processor'
import { useSettingsStore } from '../store/settingsStore'
import { useAppStore } from '../store/appStore'

const log = (...args: unknown[]) => { console.log(...args); window.api?.logToMain('info', ...args) }
const logErr = (...args: unknown[]) => { console.error(...args); window.api?.logToMain('error', ...args) }

export interface SystemAudioOptions {
  onAudioChunk: (wavBlob: Blob) => void
}

/**
 * System audio capture via getDisplayMedia().
 * Main process setDisplayMediaRequestHandler auto-approves with useSystemPicker: false.
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
      log('[SysAudio] Calling getDisplayMedia...')
      let stream: MediaStream
      try {
        // Electron main process auto-approves via setDisplayMediaRequestHandler
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true as any,
          audio: true as any
        })
        log('[SysAudio] getDisplayMedia SUCCESS, tracks:', stream.getTracks().length, 'audio:', stream.getAudioTracks().length)
      } catch (e: any) {
        logErr(`[SysAudio] getDisplayMedia FAILED: ${e.name}: ${e.message}`)
        throw new Error(`无法获取系统音频: ${e.message || e.name}`)
      }

      // Stop video tracks immediately — keep only audio
      stream.getVideoTracks().forEach((t) => {
        t.stop()
        stream.removeTrack(t)
      })

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop())
        throw new Error('没有获取到系统音频轨道。请确保在分享时勾选了"分享系统音频"。')
      }

      const audioTrack = audioTracks[0]
      log('[SysAudio] Audio track:', audioTrack.label, 'settings:', JSON.stringify(audioTrack.getSettings()))
      streamRef.current = stream

      const ctx = new AudioContext({ sampleRate })
      contextRef.current = ctx
      log('[SysAudio] AudioContext created, sampleRate:', ctx.sampleRate)

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
          log(`[SysAudio] #${processCount} rms=${rms.toFixed(6)} db=${db.toFixed(1)} voice=${hasVoice}`)
        }

        if (hasVoice) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
          chunkBufferRef.current.push(chunk)
          chunkDurationRef.current += (chunk.length / ctx.sampleRate) * 1000

          if (chunkDurationRef.current >= 8000) {
            flushBuffer()
          }
        } else if (chunkBufferRef.current.length > 0) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null
              flushBuffer()
            }, 1500)
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

  return { start, stop, isCapturing, audioLevelRef }
}
