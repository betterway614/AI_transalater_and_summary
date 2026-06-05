import { useRef, useCallback } from 'react'
import { DeepSeekService } from '../services/deepseek.service'
import { useSettingsStore } from '../store/settingsStore'
import { useSubtitleStore } from '../store/subtitleStore'

export function useDeepSeekTranslate() {
  const translatorConfig = useSettingsStore((s) => s.settings.ai.translator)
  const entries = useSubtitleStore((s) => s.entries)
  const serviceRef = useRef<DeepSeekService | null>(null)

  const getService = useCallback(() => {
    if (!serviceRef.current || serviceRef.current['apiKey'] !== translatorConfig.apiKey || serviceRef.current['baseUrl'] !== translatorConfig.baseUrl || serviceRef.current['model'] !== translatorConfig.model) {
      serviceRef.current = new DeepSeekService({
        apiKey: translatorConfig.apiKey,
        model: translatorConfig.model,
        baseUrl: translatorConfig.baseUrl
      })
    }
    return serviceRef.current
  }, [translatorConfig])

  const translate = useCallback(
    async (text: string, onUpdate: (partial: string) => void): Promise<string> => {
      const service = getService()

      // Use last 3 confirmed entries as context
      const context = entries
        .filter((e) => e.isFinal)
        .slice(-3)
        .map((e) => e.originalText)

      let result = ''
      for await (const chunk of service.streamingTranslate(text, context)) {
        result = chunk.text
        onUpdate(result)
      }
      return result
    },
    [getService, entries]
  )

  return { translate }
}
