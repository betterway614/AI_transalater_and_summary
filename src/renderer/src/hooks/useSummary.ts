import { useSummaryStore } from '../store/summaryStore'

export function useSummary() {
  const summary = useSummaryStore((s) => s.summary)
  const isGenerating = useSummaryStore((s) => s.isGenerating)
  const sessionGeneratingId = useSummaryStore((s) => s.sessionGeneratingId)
  const generateSummary = useSummaryStore((s) => s.generateSummary)
  const setSummary = useSummaryStore((s) => s.setSummary)

  return { summary, isGenerating, sessionGeneratingId, generateSummary, setSummary }
}
