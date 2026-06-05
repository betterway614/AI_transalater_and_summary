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
