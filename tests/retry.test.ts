import { describe, it, expect, vi } from 'vitest'
import { retryWithBackoff } from '../src/shared/retry'

describe('retryWithBackoff', () => {
  it('should succeed on first attempt without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await retryWithBackoff(fn)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on transient failure and succeed on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce('recovered')

    const result = await retryWithBackoff(fn)
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should exhaust all retries and throw on final error', async () => {
    const error = new Error('Persistent failure')
    const fn = vi.fn().mockRejectedValue(error)

    await expect(retryWithBackoff(fn)).rejects.toThrow('Persistent failure')
    // Default: maxRetries=2 → 3 total attempts (0, 1, 2)
    expect(fn).toHaveBeenCalledTimes(3)
  }, 10000)

  it('should respect custom maxRetries', async () => {
    const error = new Error('fail')
    const fn = vi.fn().mockRejectedValue(error)

    await expect(retryWithBackoff(fn, { maxRetries: 0 })).rejects.toThrow('fail')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should respect custom maxRetries=4', async () => {
    const error = new Error('fail')
    const fn = vi.fn().mockRejectedValue(error)

    // Use small baseDelay so exponential backoff doesn't timeout (1+2+4+8=15ms)
    await expect(retryWithBackoff(fn, { maxRetries: 4, baseDelayMs: 1 })).rejects.toThrow('fail')
    expect(fn).toHaveBeenCalledTimes(5) // 0→4 inclusive
  })

  it('should use custom baseDelayMs', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('ok')

    const start = Date.now()
    const result = await retryWithBackoff(fn, { baseDelayMs: 50 })
    const elapsed = Date.now() - start

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
    // First retry delay ≈ 50ms (no growth since base*2^0=50)
    expect(elapsed).toBeGreaterThanOrEqual(40)
  })

  it('should use defaults from shared constants when no options given', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retryWithBackoff(fn)
    expect(result).toBe('ok')
    // maxRetries defaults to API_MAX_RETRIES (2)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should use custom label in error prefix', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'))
    // Just verify it doesn't crash with custom label
    await expect(retryWithBackoff(fn, { label: 'CustomSvc', maxRetries: 0 }))
      .rejects.toThrow('boom')
  })

  it('should return correct result type', async () => {
    const fn = vi.fn().mockResolvedValue({ data: [1, 2, 3], count: 3 })

    const result = await retryWithBackoff(fn)
    expect(result.data).toEqual([1, 2, 3])
    expect(result.count).toBe(3)
  })
})
