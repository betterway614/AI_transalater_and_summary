import { API_MAX_RETRIES, API_RETRY_DELAY_MS } from './constants'

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelayMs?: number; label?: string }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? API_MAX_RETRIES
  const baseDelayMs = options?.baseDelayMs ?? API_RETRY_DELAY_MS
  const label = options?.label ?? 'retry'

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries) throw err
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), 8000)
      console.warn(`[${label}] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, err)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('Unreachable')
}
