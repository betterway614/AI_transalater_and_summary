const TARGET_SAMPLE_RATE = 16000

/**
 * Resample audio data to target sample rate using OfflineAudioContext
 */
export async function resampleAudio(
  audioData: Float32Array,
  sourceRate: number,
  targetRate: number = TARGET_SAMPLE_RATE
): Promise<Float32Array> {
  if (sourceRate === targetRate) return audioData

  const ctx = new OfflineAudioContext(1, Math.ceil(audioData.length * (targetRate / sourceRate)), targetRate)
  const buffer = ctx.createBuffer(1, audioData.length, sourceRate)
  buffer.getChannelData(0).set(audioData)

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start()

  const rendered = await ctx.startRendering()
  return rendered.getChannelData(0)
}

/**
 * Simple VAD: check if audio chunk has voice activity
 * Returns true if the RMS energy exceeds the threshold
 */
export function detectVoiceActivity(audioData: Float32Array, thresholdDb: number = -40): boolean {
  let sum = 0
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i]
  }
  const rms = Math.sqrt(sum / audioData.length)
  const db = 20 * Math.log10(rms + 1e-10)
  return db > thresholdDb
}

/**
 * Convert Float32Array PCM to WAV format Buffer
 */
export function pcmToWav(pcmData: Float32Array, sampleRate: number = TARGET_SAMPLE_RATE): ArrayBuffer {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcmData.length * (bitsPerSample / 8)
  const headerSize = 44
  const totalSize = headerSize + dataSize

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalSize - 8, true)
  writeString(view, 8, 'WAVE')

  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Write PCM samples
  let offset = 44
  for (let i = 0; i < pcmData.length; i++) {
    const sample = Math.max(-1, Math.min(1, pcmData[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return buffer
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

/**
 * Compute word-level overlap ratio between two text strings.
 * For Chinese text uses character bigrams; for English uses whitespace tokens.
 * Returns 0.0 (no overlap) to 1.0 (identical content).
 */
export function computeTextOverlap(text1: string, text2: string): number {
  const tokens1 = tokenizeText(text1)
  const tokens2 = tokenizeText(text2)

  if (tokens1.size === 0 || tokens2.size === 0) return 0

  let intersection = 0
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++
  }

  return intersection / Math.min(tokens1.size, tokens2.size)
}

function tokenizeText(text: string): Set<string> {
  const trimmed = text.toLowerCase().trim()
  if (!trimmed) return new Set()

  const cjkCount = (trimmed.match(/[一-鿿㐀-䶿]/g) || []).length
  // For Chinese-heavy text, use character bigrams (stronger overlap detection)
  if (cjkCount > trimmed.length * 0.3) {
    const bigrams = new Set<string>()
    for (let i = 0; i < trimmed.length - 1; i++) {
      bigrams.add(trimmed.substring(i, i + 2))
    }
    return bigrams
  }

  // For English text, split by whitespace, strip punctuation, filter short words
  return new Set(
    trimmed
      .split(/\s+/)
      .map((w) => w.replace(/[.,!?;:'"()\-]+$/g, '').replace(/^[.,!?;:'"()\-]+/g, ''))
      .filter((w) => w.length > 1)
  )
}

/**
 * Split transcribed text at sentence boundaries.
 * Returns array of individual sentences (filters empty strings).
 */
export function splitSentences(text: string): string[] {
  if (!text.trim()) return []
  // Split on sentence-ending punctuation but keep the delimiter
  const sentences = text
    .split(/(?<=[.!?。！？])\s*/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return sentences.length > 0 ? sentences : [text.trim()]
}

/**
 * A detected speech segment with sample offsets into the PCM buffer.
 */
export interface SpeechSegment {
  startSample: number
  endSample: number
}

/**
 * Scan a full PCM buffer with energy-based VAD to locate speech segments at natural
 * silence boundaries.  Designed for offline / batch processing where the complete audio
 * is available (URL mode).
 *
 * Defaults follow industry consensus:
 *   minSpeechMs = 250   (Silero VAD / faster-whisper / SenseVoice)
 *   minSilenceMs = 500  (batch-processing standard)
 *   maxSpeechMs = 20000 (20 s — keeps chunk size reasonable for translation)
 *   windowMs = 32       (512 samples @ 16 kHz, matches Silero VADIterator)
 */
export function findSpeechSegments(
  pcmData: Float32Array,
  sampleRate: number,
  options?: {
    vadThreshold?: number
    minSpeechMs?: number
    minSilenceMs?: number
    maxSpeechMs?: number
    windowMs?: number
  }
): SpeechSegment[] {
  const {
    vadThreshold = -40,
    minSpeechMs = 250,
    minSilenceMs = 500,
    maxSpeechMs = 20000,
    windowMs = 32,
  } = options || {}

  const windowSamples = Math.round((windowMs / 1000) * sampleRate)
  const minSpeechWindows = Math.ceil(minSpeechMs / windowMs)
  const minSilenceWindows = Math.ceil(minSilenceMs / windowMs)
  const maxSpeechSamples = Math.round((maxSpeechMs / 1000) * sampleRate)

  const segments: SpeechSegment[] = []
  let speechStart = -1
  let speechLen = 0
  let silenceLen = 0
  let inSpeech = false

  for (let offset = 0; offset + windowSamples <= pcmData.length; offset += windowSamples) {
    const window = pcmData.subarray(offset, offset + windowSamples)
    const hasVoice = detectVoiceActivity(window, vadThreshold)

    if (hasVoice) {
      if (!inSpeech) {
        // Transition silence → speech
        if (speechStart >= 0 && silenceLen >= minSilenceWindows) {
          // Close previous segment
          segments.push({ startSample: speechStart, endSample: offset - silenceLen * windowSamples })
          speechStart = -1
          speechLen = 0
        }
        inSpeech = true
        silenceLen = 0
        if (speechStart < 0) {
          speechStart = offset
        }
      }
      speechLen += windowSamples
      silenceLen = 0

      // Split mid-speech if exceeding maxSpeechSamples (continuous monologue)
      if (inSpeech && speechLen >= maxSpeechSamples) {
        const endSample = speechStart + maxSpeechSamples
        segments.push({ startSample: speechStart, endSample })
        speechStart = endSample
        speechLen = 0
      }
    } else {
      if (inSpeech) {
        silenceLen++
        speechLen += windowSamples
        if (silenceLen >= minSilenceWindows) {
          // Transition speech → silence: close segment
          const endSample = offset - (silenceLen - 1) * windowSamples
          const duration = endSample - speechStart
          // Only keep if meets minimum speech duration and doesn't exceed max
          if (duration >= minSpeechWindows * windowSamples) {
            if (duration > maxSpeechSamples) {
              // Split oversized segment at silence sub-boundaries or max length
              for (let s = speechStart; s < endSample; s += maxSpeechSamples) {
                segments.push({ startSample: s, endSample: Math.min(s + maxSpeechSamples, endSample) })
              }
            } else {
              segments.push({ startSample: speechStart, endSample })
            }
          }
          inSpeech = false
          speechStart = -1
          speechLen = 0
          silenceLen = 0
        }
      }
    }
  }

  // Close trailing speech segment
  if (inSpeech && speechStart >= 0) {
    const duration = pcmData.length - speechStart
    if (duration >= minSpeechWindows * windowSamples) {
      if (duration > maxSpeechSamples) {
        for (let s = speechStart; s < pcmData.length; s += maxSpeechSamples) {
          segments.push({ startSample: s, endSample: Math.min(s + maxSpeechSamples, pcmData.length) })
        }
      } else {
        segments.push({ startSample: speechStart, endSample: pcmData.length })
      }
    }
  }

  return segments
}
