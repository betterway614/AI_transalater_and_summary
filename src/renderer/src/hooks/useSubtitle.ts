import { useCallback } from 'react'
import { useSubtitleStore } from '../store/subtitleStore'
import { useAppStore } from '../store/appStore'
import { useWhisperASR } from './useWhisperASR'
import { useDeepSeekTranslate } from './useDeepSeekTranslate'
import type { InputMode } from '@shared/types'

export function useSubtitle() {
  const addEntry = useSubtitleStore((s) => s.addEntry)
  const replaceLastEntry = useSubtitleStore((s) => s.replaceLastEntry)
  const updateEntry = useSubtitleStore((s) => s.updateEntry)
  const createEntry = useSubtitleStore((s) => s.createEntry)
  const mode = useAppStore((s) => s.mode)
  const setStatus = useAppStore((s) => s.setStatus)
  const { transcribe } = useWhisperASR()
  const { translate } = useDeepSeekTranslate()

  const processAudioChunk = useCallback(
    async (audioBlob: Blob, currentMode: InputMode = mode) => {
      try {
        setStatus('listening')

        // Step 1: ASR - transcribe audio to text
        const text = await transcribe(audioBlob)
        if (!text.trim()) return

        // Step 2: Create subtitle entry
        const entry = createEntry(text, currentMode)
        addEntry(entry)
        setStatus('translating')

        // Step 3: Translate with streaming
        await translate(text, (partial) => {
          updateEntry(entry.id, partial)
        })

        // Mark as final
        replaceLastEntry({ ...entry, isFinal: true, translatedText: useSubtitleStore.getState().entries.find(e => e.id === entry.id)?.translatedText || '' })
        setStatus('listening')
      } catch (err) {
        console.error('Process audio chunk error:', err)
        setStatus('error')
      }
    },
    [mode, transcribe, translate, addEntry, replaceLastEntry, updateEntry, createEntry, setStatus]
  )

  return { processAudioChunk }
}
