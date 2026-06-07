/**
 * Format translation entries to structured Markdown
 */
export function formatMarkdown(
  entries: Array<{ originalText: string; translatedText: string; timestamp: number }>,
  title?: string
): string {
  const lines: string[] = []

  lines.push(`# ${title || '翻译记录'}`)
  lines.push('')
  lines.push(`> 生成时间: ${new Date().toLocaleString('zh-CN')}`)
  lines.push(`> 条目数量: ${entries.length}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const entry of entries) {
    const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN')
    lines.push(`**[${time}]**`)
    lines.push('')
    lines.push(`- 原文: ${entry.originalText}`)
    lines.push(`- 译文: ${entry.translatedText}`)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Format translation entries as plain text
 */
export function formatPlainText(
  entries: Array<{ originalText: string; translatedText: string }>,
  summary?: string | null
): string {
  const lines: string[] = []

  for (const entry of entries) {
    lines.push(entry.originalText)
    lines.push(entry.translatedText)
    lines.push('')
  }

  if (summary) {
    lines.push('--- AI 总结 ---')
    lines.push('')
    lines.push(summary)
  }

  return lines.join('\n')
}

/**
 * Format summary content as proper Markdown
 */
export function formatSummaryMarkdown(summary: string, sourceEntries?: number): string {
  const lines: string[] = []

  lines.push('# AI 智能总结')
  lines.push('')
  lines.push(`> 生成时间: ${new Date().toLocaleString('zh-CN')}`)
  if (sourceEntries !== undefined) {
    lines.push(`> 基于 ${sourceEntries} 条翻译记录`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(summary)

  return lines.join('\n')
}
