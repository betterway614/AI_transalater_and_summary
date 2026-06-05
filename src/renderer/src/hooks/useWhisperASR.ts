import { useRef, useCallback } from 'react'
import { WhisperService } from '../services/whisper.service'
import { useSettingsStore } from '../store/settingsStore'

export function useWhisperASR() {
  const whisperConfig = useSettingsStore((s) => s.settings.ai.whisper)
  const serviceRef = useRef<WhisperService | null>(null)

  const getService = useCallback(() => {
    if (!serviceRef.current || serviceRef.current['apiKey'] !== whisperConfig.apiKey) {
      serviceRef.current = new WhisperService({
        apiKey: whisperConfig.apiKey,
        model: whisperConfig.model,
        language: whisperConfig.language
      })
    }
    return serviceRef.current
  }, [whisperConfig])

  const transcribe = useCallback(
    async (audioBlob: Blob): Promise<string> => {
      const service = getService()
      return service.transcribe(audioBlob)
    },
    [getService]
  )

  return { transcribe }
}
