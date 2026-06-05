import { useCallback, useRef } from 'react'
import { useSubtitleStore } from '../store/subtitleStore'
import { useAppStore } from '../store/appStore'
import { useSettingsStore } from '../store/settingsStore'
import { WhisperService } from '../services/whisper.service'
import { DeepSeekService } from '../services/deepseek.service'
import type { InputMode, SubtitleEntry } from '@shared/types'

/**
 * Optimized subtitle pipeline with:
 * - Overlapping ASR/translation (next chunk starts ASR while current translates)
 * - Throttled UI updates (max 1 per 100ms during streaming)
 * - Minimal translation context (1 entry for lower TTFT)
 * - Service instance reuse via refs
 */

export function useSubtitle() {
  const addEntry = useSubtitleStore((s) => s.addEntry)
  const updateEntry = useSubtitleStore((s) => s.updateEntry)
  const replaceLastEntry = useSubtitleStore((s) => s.replaceLastEntry)
  const createEntry = useSubtitleStore((s) => s.createEntry)
  const mode = useAppStore((s) => s.mode)
  const isPaused = useAppStore((s) => s.isPaused)
  const setStatus = useAppStore((s) => s.setStatus)

  const whisperRef = useRef<WhisperService | null>(null)
  const deepseekRef = useRef<DeepSeekService | null>(null)

  const getWhisper = useCallback(() => {
    const s = useSettingsStore.getState().settings.ai.whisper
    if (!whisperRef.current) {
      whisperRef.current = new WhisperService({
        apiKey: s.apiKey,
        model: s.model,
        baseUrl: s.baseUrl,
        language: s.language
      })
    }
    return whisperRef.current
  }, [])

  const getDeepSeek = useCallback(() => {
    const s = useSettingsStore.getState().settings.ai.translator
    if (!deepseekRef.current) {
      deepseekRef.current = new DeepSeekService({
        apiKey: s.apiKey,
        model: s.model,
        baseUrl: s.baseUrl
      })
    }
    return deepseekRef.current
  }, [])

  // Throttle: track last update time per entry
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

      try {
        setStatus('listening')

        // Stage 1: ASR (uses cached service instance)
        const whisper = getWhisper()
        const text = await whisper.transcribe(audioBlob)
        if (!text.trim()) return

        // Stage 2: Create subtitle entry immediately
        const entry = createEntry(text, currentMode)
        addEntry(entry)
        setStatus('translating')

        // Stage 3: Streaming translation (non-blocking for next chunk)
        // Fire-and-forget: the translation runs independently
        translateEntry(entry).catch((err) => {
          console.error('Translation error:', err)
          setStatus('error')
        })

        setStatus('listening')
      } catch (err) {
        console.error('ASR error:', err)
        setStatus('error')
      }
    },
    [mode, isPaused, getWhisper, addEntry, createEntry, setStatus]
  )

  // Separate async function for translation — doesn't block processAudioChunk
  const translateEntry = useCallback(
    async (entry: SubtitleEntry) => {
      const deepseek = getDeepSeek()

      // Use only 1 context entry for faster TTFT
      const context = useSubtitleStore
        .getState()
        .entries.filter((e) => e.isFinal && e.id !== entry.id)
        .slice(-1)
        .map((e) => e.originalText)

      let finalTranslation = ''
      for await (const chunk of deepseek.streamingTranslate(entry.originalText, context)) {
        finalTranslation = chunk.text
        // Throttled UI updates (max 10/sec)
        throttledUpdate(entry.id, finalTranslation)
      }

      // Force final update
      throttledUpdate(entry.id, finalTranslation, true)

      // Mark as final
      const currentEntry = useSubtitleStore.getState().entries.find((e) => e.id === entry.id)
      replaceLastEntry({
        ...entry,
        isFinal: true,
        translatedText: currentEntry?.translatedText || finalTranslation
      })
      lastUpdateRef.current.delete(entry.id)
    },
    [getDeepSeek, throttledUpdate, replaceLastEntry]
  )

  return { processAudioChunk }
}
