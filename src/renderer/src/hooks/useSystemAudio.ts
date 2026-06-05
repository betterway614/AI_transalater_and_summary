import { useCallback, useRef, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { useSubtitleStore } from '../store/subtitleStore'
import { useSettingsStore } from '../store/settingsStore'
import { WhisperService } from '../services/whisper.service'
import { DeepSeekService } from '../services/deepseek.service'
import type { SubtitleEntry } from '@shared/types'

/**
 * Hook for system audio capture mode.
 * Uses main process WASAPI/sox/ffmpeg via IPC to capture system audio.
 * Pipes audio chunks through the same ASR → translate → subtitle pipeline.
 */
export function useSystemAudio() {
  const setStatus = useAppStore((s) => s.setStatus)
  const addEntry = useSubtitleStore((s) => s.addEntry)
  const createEntry = useSubtitleStore((s) => s.createEntry)
  const updateEntry = useSubtitleStore((s) => s.updateEntry)
  const markFinal = useSubtitleStore((s) => s.markFinal)

  const whisperRef = useRef<WhisperService | null>(null)
  const deepseekRef = useRef<DeepSeekService | null>(null)
  const whisperFpRef = useRef('')
  const deepseekFpRef = useRef('')
  const cancelledRef = useRef(false)
  const lastUpdateRef = useRef<Map<string, number>>(new Map())

  const getWhisper = useCallback(() => {
    const s = useSettingsStore.getState().settings.ai.whisper
    const fp = `${s.apiKey}|${s.model}|${s.baseUrl}|${s.language}`
    if (!whisperRef.current || whisperFpRef.current !== fp) {
      whisperRef.current = new WhisperService({
        apiKey: s.apiKey, model: s.model, baseUrl: s.baseUrl, language: s.language
      })
      whisperFpRef.current = fp
    }
    return whisperRef.current
  }, [])

  const getDeepSeek = useCallback(() => {
    const s = useSettingsStore.getState().settings.ai.translator
    const fp = `${s.apiKey}|${s.model}|${s.baseUrl}`
    if (!deepseekRef.current || deepseekFpRef.current !== fp) {
      deepseekRef.current = new DeepSeekService({
        apiKey: s.apiKey, model: s.model, baseUrl: s.baseUrl
      })
      deepseekFpRef.current = fp
    }
    return deepseekRef.current
  }, [])

  const throttledUpdate = useCallback(
    (entryId: string, text: string, force = false) => {
      const now = Date.now()
      const last = lastUpdateRef.current.get(entryId) || 0
      if (force || now - last >= 100) {
        updateEntry(entryId, text)
        lastUpdateRef.current.set(entryId, now)
      }
    },
    [updateEntry]
  )

  const translateEntry = useCallback(
    async (entry: SubtitleEntry) => {
      const deepseek = getDeepSeek()
      const context = useSubtitleStore
        .getState()
        .entries.filter((e) => e.isFinal && e.id !== entry.id)
        .slice(-1)
        .map((e) => e.originalText)

      let finalTranslation = ''
      for await (const chunk of deepseek.streamingTranslate(entry.originalText, context)) {
        if (cancelledRef.current) return
        finalTranslation = chunk.text
        throttledUpdate(entry.id, finalTranslation)
      }

      throttledUpdate(entry.id, finalTranslation, true)
      markFinal(entry.id, finalTranslation)
      lastUpdateRef.current.delete(entry.id)
    },
    [getDeepSeek, throttledUpdate, markFinal]
  )

  const processChunk = useCallback(
    async (audioBuffer: ArrayBuffer) => {
      if (cancelledRef.current) return

      try {
        const blob = new Blob([audioBuffer], { type: 'audio/wav' })
        const whisper = getWhisper()
        const text = await whisper.transcribe(blob)
        if (!text.trim()) return

        const entry = createEntry(text, 'system-audio')
        addEntry(entry)

        // Fire-and-forget translation
        translateEntry(entry).catch((err) => {
          console.error('[SystemAudio] Translation error:', err)
        })
      } catch (err) {
        console.error('[SystemAudio] ASR error:', err)
      }
    },
    [getWhisper, addEntry, createEntry, translateEntry]
  )

  const start = useCallback(async () => {
    cancelledRef.current = false
    setStatus('connecting')

    try {
      // Register data listener
      const unsubscribe = window.api.systemAudio.onData((data: ArrayBuffer) => {
        processChunk(data)
      })

      // Start capture via main process
      const result = await window.api.systemAudio.start()

      setStatus('listening')

      // Return cleanup function
      return () => {
        unsubscribe()
      }
    } catch (err: any) {
      console.error('[SystemAudio] Start failed:', err)
      setStatus('error')
      throw err
    }
  }, [setStatus, processChunk])

  const stop = useCallback(async () => {
    cancelledRef.current = true
    try {
      await window.api.systemAudio.stop()
    } catch {
      // ignore
    }
    setStatus('idle')
  }, [setStatus])

  return { start, stop }
}
