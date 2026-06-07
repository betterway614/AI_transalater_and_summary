import { describe, it, expect } from 'vitest'
import { detectVoiceActivity, pcmToWav, computeTextOverlap, splitSentences, findSpeechSegments } from '../src/renderer/src/services/audio-processor'
import type { SpeechSegment } from '../src/renderer/src/services/audio-processor'

describe('Audio Processor', () => {
  describe('detectVoiceActivity', () => {
    it('should detect voice in non-silent audio', () => {
      // Generate a sine wave (simulates voice)
      const sampleRate = 16000
      const duration = 0.5
      const freq = 440
      const samples = new Float32Array(sampleRate * duration)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / sampleRate)
      }

      const result = detectVoiceActivity(samples, -40)
      expect(result).toBe(true)
    })

    it('should not detect voice in silent audio', () => {
      // Generate near-silence
      const samples = new Float32Array(8000)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = 0.00001 * Math.random()
      }

      const result = detectVoiceActivity(samples, -40)
      expect(result).toBe(false)
    })

    it('should handle empty audio', () => {
      const samples = new Float32Array(0)
      const result = detectVoiceActivity(samples, -40)
      expect(result).toBe(false)
    })

    it('should respond to threshold changes', () => {
      const samples = new Float32Array(8000)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = 0.01 * Math.sin(i)
      }

      // Low threshold: should detect
      expect(detectVoiceActivity(samples, -80)).toBe(true)
      // High threshold: should not detect
      expect(detectVoiceActivity(samples, -5)).toBe(false)
    })
  })

  describe('pcmToWav', () => {
    it('should produce valid WAV header', () => {
      const pcm = new Float32Array(16000) // 1 second at 16kHz
      for (let i = 0; i < pcm.length; i++) {
        pcm[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 16000)
      }

      const wav = pcmToWav(pcm, 16000)
      const view = new DataView(wav)

      // Check RIFF header
      const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
      expect(riff).toBe('RIFF')

      // Check WAVE format
      const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))
      expect(wave).toBe('WAVE')

      // Check fmt chunk
      const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15))
      expect(fmt).toBe('fmt ')

      // Check PCM format (1)
      expect(view.getUint16(20, true)).toBe(1)

      // Check channels (1)
      expect(view.getUint16(22, true)).toBe(1)

      // Check sample rate
      expect(view.getUint32(24, true)).toBe(16000)

      // Check bits per sample
      expect(view.getUint16(34, true)).toBe(16)
    })

    it('should have correct size', () => {
      const pcm = new Float32Array(16000)
      const wav = pcmToWav(pcm, 16000)

      // Header (44) + data (16000 * 2 bytes per sample)
      expect(wav.byteLength).toBe(44 + 16000 * 2)
    })

    it('should clamp audio values', () => {
      const pcm = new Float32Array([2.0, -2.0, 0.5, -0.5])
      const wav = pcmToWav(pcm, 16000)
      const view = new DataView(wav)

      // First sample should be clamped to max (0x7FFF = 32767)
      expect(view.getInt16(44, true)).toBe(32767)
      // Second sample should be clamped to min (-0x8000 = -32768)
      expect(view.getInt16(46, true)).toBe(-32768)
    })
  })

  describe('computeTextOverlap', () => {
    it('should return 1.0 for identical english texts', () => {
      const result = computeTextOverlap('Hello world', 'Hello world')
      expect(result).toBeCloseTo(1.0, 1)
    })

    it('should return 0 for completely different texts', () => {
      const result = computeTextOverlap('apple banana', 'zebra xylophone')
      expect(result).toBeCloseTo(0.0, 1)
    })

    it('should detect partial overlap', () => {
      const result = computeTextOverlap(
        'Hello everyone and welcome to the show',
        'welcome to the show today we have'
      )
      expect(result).toBeGreaterThan(0.3)
      expect(result).toBeLessThan(1.0)
    })

    it('should return 1.0 for identical chinese texts', () => {
      const result = computeTextOverlap('大家好，欢迎收看', '大家好，欢迎收看')
      expect(result).toBeCloseTo(1.0, 1)
    })

    it('should detect overlap in chinese texts', () => {
      const result = computeTextOverlap(
        '大家好，欢迎收看今天的节目',
        '欢迎收看今天的节目，我是主持人'
      )
      expect(result).toBeGreaterThan(0.4)
    })

    it('should handle empty strings', () => {
      expect(computeTextOverlap('', 'hello')).toBe(0)
      expect(computeTextOverlap('hello', '')).toBe(0)
      expect(computeTextOverlap('', '')).toBe(0)
    })

    it('should be case insensitive for english', () => {
      const result = computeTextOverlap('HELLO World', 'hello world')
      expect(result).toBeCloseTo(1.0, 1)
    })

    it('should detect overlapping audio transcription scenario', () => {
      // Simulates: chunk 1 captures "Hello everyone, and welcome cathem"
      // chunk 2 captures overlapping "welcome cathem. Before we left..."
      const result = computeTextOverlap(
        'Hello everyone, and welcome cathem',
        'welcome cathem. Before we left, well, she forgot'
      )
      expect(result).toBeGreaterThan(0.3) // Should flag as overlapping
    })
  })

  describe('findSpeechSegments', () => {
    // Helper: generate a sine wave of given duration (seconds) at sampleRate
    function tone(durationSec: number, sampleRate = 16000, freq = 440, amplitude = 0.5): Float32Array {
      const len = Math.round(durationSec * sampleRate)
      const samples = new Float32Array(len)
      for (let i = 0; i < len; i++) {
        samples[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate)
      }
      return samples
    }

    // Helper: generate silence
    function silence(durationSec: number, sampleRate = 16000): Float32Array {
      return new Float32Array(Math.round(durationSec * sampleRate))
    }

    // Helper: concatenate Float32Arrays
    function concat(...arrays: Float32Array[]): Float32Array {
      const totalLen = arrays.reduce((sum, a) => sum + a.length, 0)
      const result = new Float32Array(totalLen)
      let offset = 0
      for (const a of arrays) {
        result.set(a, offset)
        offset += a.length
      }
      return result
    }

    it('should return empty array for empty audio', () => {
      const result = findSpeechSegments(new Float32Array(0), 16000)
      expect(result).toEqual([])
    })

    it('should return empty array for all-silent audio', () => {
      const result = findSpeechSegments(silence(3), 16000)
      expect(result).toEqual([])
    })

    it('should return empty array for audio below voice threshold', () => {
      // Very quiet tone below -40dB threshold
      const samples = new Float32Array(16000) // 1 second
      for (let i = 0; i < samples.length; i++) {
        samples[i] = 0.0001 * Math.sin((2 * Math.PI * 440 * i) / 16000)
      }
      const result = findSpeechSegments(samples, 16000, { vadThreshold: -40 })
      expect(result).toEqual([])
    })

    it('should detect a single continuous voice segment', () => {
      // 2 seconds of voice — well above minSpeech (250ms)
      const audio = tone(2)
      const result = findSpeechSegments(audio, 16000)

      expect(result.length).toBe(1)
      expect(result[0].startSample).toBe(0)
      // End should be close to the end of the audio
      expect(result[0].endSample).toBeGreaterThan(audio.length * 0.9)
    })

    it('should detect two voice segments separated by sufficient silence', () => {
      // 1.5s voice → 1s silence → 1.5s voice
      const audio = concat(tone(1.5), silence(1), tone(1.5))
      const result = findSpeechSegments(audio, 16000)

      expect(result.length).toBe(2)

      // Second segment should start well after the silence gap
      const gapEnd = 1.5 * 16000 + 1 * 16000 // end of silence
      expect(result[1].startSample).toBeGreaterThanOrEqual(gapEnd * 0.9)

      // Verify segments don't overlap
      expect(result[0].endSample).toBeLessThanOrEqual(result[1].startSample)
    })

    it('should merge voice separated by short silence below minSilenceMs', () => {
      // 1s voice → 0.2s silence → 1s voice (200ms < 500ms minSilence → merged)
      const audio = concat(tone(1), silence(0.2), tone(1))
      const result = findSpeechSegments(audio, 16000)

      // Should be merged into one segment
      expect(result.length).toBe(1)
    })

    it('should filter out fragments shorter than minSpeechMs', () => {
      // 0.1s voice → long silence → 2s voice (100ms < 250ms minSpeech → filtered)
      const audio = concat(tone(0.1), silence(1), tone(2))
      const result = findSpeechSegments(audio, 16000)

      expect(result.length).toBe(1)
      // The single segment should be the long one (start well after the noise)
      expect(result[0].startSample).toBeGreaterThan(1 * 16000) // after the 1s silence
    })

    it('should split speech exceeding maxSpeechMs', () => {
      const maxSpeechMs = 500
      const audio = tone(1.5) // 1500ms > 500ms max → should split into ~3 segments
      const result = findSpeechSegments(audio, 16000, { maxSpeechMs })

      expect(result.length).toBeGreaterThanOrEqual(3)

      // Each segment should not exceed maxSpeech
      for (const seg of result) {
        const durationMs = ((seg.endSample - seg.startSample) / 16000) * 1000
        expect(durationMs).toBeLessThanOrEqual(maxSpeechMs + 100) // small tolerance
      }

      // Segments should be contiguous (no gaps)
      for (let i = 1; i < result.length; i++) {
        expect(result[i].startSample).toBe(result[i - 1].endSample)
      }
    })

    it('should capture trailing voice without following silence', () => {
      // 1s silence → 1.5s voice (no trailing silence)
      const audio = concat(silence(1), tone(1.5))
      const result = findSpeechSegments(audio, 16000)

      expect(result.length).toBe(1)
      expect(result[0].endSample).toBeGreaterThan(audio.length * 0.85)
    })

    it('should respect custom vadThreshold', () => {
      // Moderate tone: ~ -18 dB
      const samples = tone(3, 16000, 440, 0.1)

      // Default threshold (-40): should detect
      const resultLow = findSpeechSegments(samples, 16000)
      expect(resultLow.length).toBeGreaterThanOrEqual(1)

      // Strict threshold (-10): should NOT detect (0.1 amplitude ≈ -18 dB < -10)
      const resultHigh = findSpeechSegments(samples, 16000, { vadThreshold: -10 })
      expect(resultHigh.length).toBe(0)
    })

    it('should respect custom minSpeechMs and minSilenceMs', () => {
      // 1s voice → 0.8s silence → 1s voice
      const audio = concat(tone(1), silence(0.8), tone(1))

      // Default (minSilence=500ms): 800ms > 500ms → 2 segments
      const resultDefault = findSpeechSegments(audio, 16000)
      expect(resultDefault.length).toBe(2)

      // Custom (minSilence=1000ms): 800ms < 1000ms → 1 segment
      const resultCustom = findSpeechSegments(audio, 16000, { minSilenceMs: 1000 })
      expect(resultCustom.length).toBe(1)
    })

    it('should produce sample offsets that map to correct durations', () => {
      // 2s silence → 3s voice → 2s silence → 4s voice
      const audio = concat(silence(2), tone(3), silence(2), tone(4))
      const result = findSpeechSegments(audio, 16000)

      expect(result.length).toBe(2)

      // First voice segment should be ~3s
      const dur1 = ((result[0].endSample - result[0].startSample) / 16000) * 1000
      expect(dur1).toBeGreaterThan(2500)
      expect(dur1).toBeLessThan(3500)

      // Second voice segment should be ~4s
      const dur2 = ((result[1].endSample - result[1].startSample) / 16000) * 1000
      expect(dur2).toBeGreaterThan(3500)
      expect(dur2).toBeLessThan(4500)
    })

    it('should handle audio shorter than one window', () => {
      // 10ms of voice — less than a single 32ms window
      const audio = tone(0.01)
      const result = findSpeechSegments(audio, 16000)
      // Should not crash, may or may not detect depending on padding
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return segments in ascending sample order', () => {
      // Multiple segments across a longer audio
      const audio = concat(
        silence(0.5), tone(1), silence(0.8), tone(1.2), silence(0.8), tone(0.8), silence(0.5)
      )
      const result = findSpeechSegments(audio, 16000)

      let prevEnd = 0
      for (const seg of result) {
        expect(seg.startSample).toBeGreaterThanOrEqual(prevEnd)
        expect(seg.endSample).toBeGreaterThan(seg.startSample)
        prevEnd = seg.endSample
      }
    })
  })

  describe('splitSentences', () => {
    it('should split english sentences on period', () => {
      const result = splitSentences('Hello world. This is a test.')
      expect(result).toEqual(['Hello world.', 'This is a test.'])
    })

    it('should split on multiple punctuation types', () => {
      const result = splitSentences('Hi there! How are you? I am fine.')
      expect(result).toEqual(['Hi there!', 'How are you?', 'I am fine.'])
    })

    it('should split chinese sentences', () => {
      const result = splitSentences('大家好。欢迎收看！今天怎么样？')
      expect(result).toEqual(['大家好。', '欢迎收看！', '今天怎么样？'])
    })

    it('should return single element if no punctuation', () => {
      const result = splitSentences('Hello world')
      expect(result).toEqual(['Hello world'])
    })

    it('should handle empty string', () => {
      expect(splitSentences('')).toEqual([])
      expect(splitSentences('   ')).toEqual([])
    })

    it('should preserve trailing punctuation', () => {
      const result = splitSentences('First sentence. Second sentence.')
      expect(result[0]).toBe('First sentence.')
      expect(result[1]).toBe('Second sentence.')
    })
  })
})
