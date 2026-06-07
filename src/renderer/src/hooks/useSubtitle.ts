import { useCallback, useRef } from 'react'
import { useSubtitleStore } from '../store/subtitleStore'
import { useAppStore } from '../store/appStore'
import { useSettingsStore } from '../store/settingsStore'
import { WhisperService } from '../services/whisper.service'
import { DeepSeekService } from '../services/deepseek.service'
import { computeTextOverlap } from '../services/audio-processor'
import type { InputMode, SubtitleEntry } from '@shared/types'

const DEDUP_OVERLAP_THRESHOLD = 0.6   // skip if overlap ratio >= this
const DEDUP_LOOKBACK = 3              // compare against last N entries
const DEDUP_MAX_AGE_MS = 8000         // ignore entries older than this for dedup

/**
 * Optimized subtitle pipeline:
 * - Overlapping ASR/translation (fire-and-forget)
 * - Text-level deduplication to suppress overlapping-audio repeats
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

        // Stage 1.5: Deduplicate — skip if largely overlapping with recent entries
        if (isDuplicate(text)) {
          console.log('[Subtitle] Skipping duplicate/overlapping text')
          return
        }

        // Stage 2: Create subtitle entries (one per sentence for readability)
        const sentences = splitSentences(text)
        for (const sentence of sentences) {
          const entry = createEntry(sentence, currentMode)
          addEntry(entry)

          // Stage 3: Fire-and-forget translation (non-blocking for next chunk)
          translateEntry(entry).catch((err) => {
            console.error('Translation error:', err)
            setStatus('error')
          })
        }
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

/**
 * Check whether `text` substantially overlaps with any recent finalized entry.
 * Prevents overlapping audio from producing duplicate subtitle entries.
 */
function isDuplicate(text: string): boolean {
  const now = Date.now()
  const recentEntries = useSubtitleStore.getState().entries
    .slice(-DEDUP_LOOKBACK)
    .filter((e) => now - e.timestamp < DEDUP_MAX_AGE_MS)

  for (const entry of recentEntries) {
    const overlap = computeTextOverlap(text, entry.originalText)
    if (overlap >= DEDUP_OVERLAP_THRESHOLD) {
      return true
    }
  }
  return false
}

/**
 * Split transcribed text at sentence boundaries.
 * Handles English (.!?) and Chinese (。！？) punctuation.
 */
function splitSentences(text: string): string[] {
  if (!text.trim()) return []
  const sentences = text
    .split(/(?<=[.!?。！？])\s*/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return sentences.length > 0 ? sentences : [text.trim()]
}
