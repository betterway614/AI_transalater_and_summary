import { describe, it, expect } from 'vitest'
import { detectVoiceActivity, pcmToWav } from '../src/renderer/src/services/audio-processor'

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
})
