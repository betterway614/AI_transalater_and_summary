import { useCallback } from 'react'
import { useSubtitleStore } from '../store/subtitleStore'
import { useAppStore } from '../store/appStore'
import { useSettingsStore } from '../store/settingsStore'
import { WhisperService } from '../services/whisper.service'
import { DeepSeekService } from '../services/deepseek.service'
import type { InputMode } from '@shared/types'

export function useSubtitle() {
  const addEntry = useSubtitleStore((s) => s.addEntry)
  const replaceLastEntry = useSubtitleStore((s) => s.replaceLastEntry)
  const updateEntry = useSubtitleStore((s) => s.updateEntry)
  const createEntry = useSubtitleStore((s) => s.createEntry)
  const mode = useAppStore((s) => s.mode)
  const isPaused = useAppStore((s) => s.isPaused)
  const setStatus = useAppStore((s) => s.setStatus)

  const processAudioChunk = useCallback(
    async (audioBlob: Blob, currentMode: InputMode = mode) => {
      if (isPaused) return

      const settings = useSettingsStore.getState().settings

      try {
        setStatus('listening')

        // Step 1: ASR
        const whisper = new WhisperService({
          apiKey: settings.ai.whisper.apiKey,
          model: settings.ai.whisper.model,
          language: settings.ai.whisper.language
        })
        const text = await whisper.transcribe(audioBlob)
        if (!text.trim()) return

        // Step 2: Create subtitle entry
        const entry = createEntry(text, currentMode)
        addEntry(entry)
        setStatus('translating')

        // Step 3: Translate with streaming
        const deepseek = new DeepSeekService({
          apiKey: settings.ai.translator.apiKey,
          model: settings.ai.translator.model,
          baseUrl: settings.ai.translator.baseUrl
        })

        const context = useSubtitleStore
          .getState()
          .entries.filter((e) => e.isFinal)
          .slice(-3)
          .map((e) => e.originalText)

        let finalTranslation = ''
        for await (const chunk of deepseek.streamingTranslate(text, context)) {
          finalTranslation = chunk.text
          updateEntry(entry.id, finalTranslation)
        }

        // Step 4: Mark as final
        const currentEntry = useSubtitleStore.getState().entries.find((e) => e.id === entry.id)
        replaceLastEntry({
          ...entry,
          isFinal: true,
          translatedText: currentEntry?.translatedText || finalTranslation
        })
        setStatus('listening')
      } catch (err) {
        console.error('Process audio chunk error:', err)
        setStatus('error')
      }
    },
    [mode, isPaused, addEntry, replaceLastEntry, updateEntry, createEntry, setStatus]
  )

  return { processAudioChunk }
}
