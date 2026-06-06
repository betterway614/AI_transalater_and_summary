import { useSummaryStore } from '../store/summaryStore'

export function useSummary() {
  const summary = useSummaryStore((s) => s.summary)
  const isGenerating = useSummaryStore((s) => s.isGenerating)
  const generateSummary = useSummaryStore((s) => s.generateSummary)
  const setSummary = useSummaryStore((s) => s.setSummary)

  return { summary, isGenerating, generateSummary, setSummary }
}
