import { useCallback, useRef } from 'react'
import { useSubtitleStore } from '../store/subtitleStore'
import { useAppStore } from '../store/appStore'
import { useSettingsStore } from '../store/settingsStore'
import { WhisperService } from '../services/whisper.service'
import { DeepSeekService } from '../services/deepseek.service'
import type { InputMode, SubtitleEntry } from '@shared/types'

/**
 * Optimized subtitle pipeline:
 * - Overlapping ASR/translation (fire-and-forget)
 * - Throttled UI updates (100ms)
 * - Service cache invalidated on settings change
 * - Translation uses entry ID for correct replace (not "last entry")
 */

export function useSubtitle() {
  const addEntry = useSubtitleStore((s) => s.addEntry)
  const updateEntry = useSubtitleStore((s) => s.updateEntry)
  const markFinal = useSubtitleStore((s) => s.markFinal)
  const createEntry = useSubtitleStore((s) => s.createEntry)
  const mode = useAppStore((s) => s.mode)
  const isPaused = useAppStore((s) => s.isPaused)
  const setStatus = useAppStore((s) => s.setStatus)

  // Service cache with settings fingerprint for invalidation
  const whisperRef = useRef<WhisperService | null>(null)
  const deepseekRef = useRef<DeepSeekService | null>(null)
  const whisperFingerprintRef = useRef('')
  const deepseekFingerprintRef = useRef('')

  const getWhisper = useCallback(() => {
    const s = useSettingsStore.getState().settings.ai.whisper
    const fp = `${s.apiKey}|${s.model}|${s.baseUrl}|${s.language}`
    if (!whisperRef.current || whisperFingerprintRef.current !== fp) {
      whisperRef.current = new WhisperService({
        apiKey: s.apiKey, model: s.model, baseUrl: s.baseUrl, language: s.language
      })
      whisperFingerprintRef.current = fp
    }
    return whisperRef.current
  }, [])

  const getDeepSeek = useCallback(() => {
    const s = useSettingsStore.getState().settings.ai.translator
    const fp = `${s.apiKey}|${s.model}|${s.baseUrl}`
    if (!deepseekRef.current || deepseekFingerprintRef.current !== fp) {
      deepseekRef.current = new DeepSeekService({
        apiKey: s.apiKey, model: s.model, baseUrl: s.baseUrl
      })
      deepseekFingerprintRef.current = fp
    }
    return deepseekRef.current
  }, [])

  // Throttle: max 1 UI update per 100ms per entry
  const lastUpdateRef = useRef<Map<string, number>>(new Map())

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

  const processAudioChunk = useCallback(
    async (audioBlob: Blob, currentMode: InputMode = mode) => {
      if (isPaused) return

      // Guard: don't start if no API key configured
      const settings = useSettingsStore.getState().settings
      if (!settings.ai.whisper.apiKey) {
        console.log('[Subtitle] Whisper API key not configured — skipping ASR')
        return
      }

      try {
        setStatus('listening')
        console.log(`[Subtitle] processAudioChunk: ${audioBlob.size} bytes, mode=${currentMode}`)

        // Stage 1: ASR
        const whisper = getWhisper()
        console.log('[Subtitle] Calling Whisper transcribe...')
        const text = await whisper.transcribe(audioBlob)
        console.log(`[Subtitle] Whisper result: "${text.substring(0, 100)}"`)
        if (!text.trim()) return

        // Stage 2: Create subtitle entry
        const entry = createEntry(text, currentMode)
        addEntry(entry)

        // Stage 3: Fire-and-forget translation (non-blocking for next chunk)
        translateEntry(entry).catch((err) => {
          console.error('Translation error:', err)
          setStatus('error')
        })
      } catch (err) {
        console.error('ASR error:', err)
        setStatus('error')
      }
    },
    [mode, isPaused, getWhisper, addEntry, createEntry, setStatus]
  )

  // Separate async function for translation — uses entry ID for correct replace
  const translateEntry = useCallback(
    async (entry: SubtitleEntry) => {
      const deepseek = getDeepSeek()

      let finalTranslation = ''
      for await (const chunk of deepseek.streamingTranslate(entry.originalText)) {
        finalTranslation = chunk.text
        throttledUpdate(entry.id, finalTranslation)
      }

      // Force final update then mark as final by ID
      throttledUpdate(entry.id, finalTranslation, true)
      markFinal(entry.id, finalTranslation)
      lastUpdateRef.current.delete(entry.id)
    },
    [getDeepSeek, throttledUpdate, markFinal]
  )

  return { processAudioChunk }
}
