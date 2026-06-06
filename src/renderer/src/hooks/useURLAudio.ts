import { useCallback, useRef, useEffect } from 'react'
import { useSubtitleStore } from '../store/subtitleStore'
import { useAppStore } from '../store/appStore'
import type { InputMode, SubtitleEntry } from '@shared/types'
import { WhisperService } from '../services/whisper.service'
import { DeepSeekService } from '../services/deepseek.service'
import { useSettingsStore } from '../store/settingsStore'

const CHUNK_DURATION_SEC = 30
const SAMPLE_RATE = 16000
const BYTES_PER_SAMPLE = 2
const HEADER_SIZE = 44

export function useURLAudio() {
  const setStatus = useAppStore((s) => s.setStatus)
  const clearEntries = useSubtitleStore((s) => s.clearEntries)
  const addEntry = useSubtitleStore((s) => s.addEntry)
  const createEntry = useSubtitleStore((s) => s.createEntry)
  const updateEntry = useSubtitleStore((s) => s.updateEntry)
  const markFinal = useSubtitleStore((s) => s.markFinal)

  const whisperRef = useRef<WhisperService | null>(null)
  const deepseekRef = useRef<DeepSeekService | null>(null)
  const whisperFpRef = useRef('')
  const deepseekFpRef = useRef('')
  const cancelledRef = useRef(false)
  const progressRef = useRef(0)

  const getWhisper = useCallback(() => {
    const s = useSettingsStore.getState().settings.ai.whisper
    const fp = `${s.apiKey}|${s.model}|${s.baseUrl}|${s.language}`
    if (!whisperRef.current || whisperFpRef.current !== fp) {
      whisperRef.current = new WhisperService({
        apiKey: s.apiKey, model: s.model, baseUrl: s.baseUrl, language: s.language
      })
      whisperFpRef.current = fp
    }
    return whisperRef.current
  }, [])

  const getDeepSeek = useCallback(() => {
    const s = useSettingsStore.getState().settings.ai.translator
    const fp = `${s.apiKey}|${s.model}|${s.baseUrl}`
    if (!deepseekRef.current || deepseekFpRef.current !== fp) {
      deepseekRef.current = new DeepSeekService({
        apiKey: s.apiKey, model: s.model, baseUrl: s.baseUrl
      })
      deepseekFpRef.current = fp
    }
    return deepseekRef.current
  }, [])

  // Listen for yt-dlp download progress
  useEffect(() => {
    if (!window.api?.ytdlp) return
    const unsubscribe = window.api.ytdlp.onProgress((p) => {
      progressRef.current = p
    })
    return unsubscribe
  }, [])

  const start = useCallback(async (url: string, mode: InputMode, options?: { partIndex?: number }) => {
    cancelledRef.current = false
    progressRef.current = 0
    clearEntries() // Clear previous video's entries before starting new one
    setStatus('connecting')

    try {
      // Auto-detect platform cookies
      const cookiesPath = await window.api.auth.detectPlatform(url)

      // Step 1: Extract audio (progress via onProgress listener)
      const result = await window.api.ytdlp.extractAudio(url, options?.partIndex, cookiesPath || undefined)
      if (cancelledRef.current) return

      if (!result.success || !result.data) {
        setStatus('error')
        console.error('[useURLAudio] yt-dlp error:', result.error)
        return
      }

      console.log(`[useURLAudio] Audio downloaded, buffer size: ${result.data.byteLength} bytes`)

      // Step 2: Split WAV into chunks
      const chunks = splitWavIntoChunks(result.data)
      console.log(`[useURLAudio] Split into ${chunks.length} chunks`)
      setStatus('listening')

      // Step 3: Process each chunk sequentially
      for (let i = 0; i < chunks.length; i++) {
        if (cancelledRef.current) break

        const chunkBlob = new Blob([chunks[i]], { type: 'audio/wav' })
        const whisper = getWhisper()

        try {
          console.log(`[useURLAudio] Processing chunk ${i + 1}/${chunks.length}, size: ${chunkBlob.size} bytes`)
          const text = await whisper.transcribe(chunkBlob)
          if (!text.trim()) {
            console.log(`[useURLAudio] Chunk ${i + 1}: empty transcription, skipping`)
            continue
          }

          console.log(`[useURLAudio] Chunk ${i + 1} transcribed: "${text.substring(0, 80)}..."`)
          const entry = createEntry(text, mode)
          addEntry(entry)
          setStatus('translating')

          await translateEntry(entry)
        } catch (err) {
          console.error(`[useURLAudio] Chunk ${i + 1} error:`, err)
        }

        setStatus('listening')
      }

      if (!cancelledRef.current) {
        setStatus('idle')
      }
    } catch (err) {
      console.error('[useURLAudio] Fatal error in start():', err)
      setStatus('error')
    }
  }, [setStatus, clearEntries, addEntry, createEntry, getWhisper, getDeepSeek, updateEntry, markFinal])

  const translateEntry = useCallback(async (entry: SubtitleEntry) => {
    const deepseek = getDeepSeek()

    let finalTranslation = ''
    for await (const chunk of deepseek.streamingTranslate(entry.originalText)) {
      if (cancelledRef.current) return
      finalTranslation = chunk.text
      updateEntry(entry.id, finalTranslation)
    }

    markFinal(entry.id, finalTranslation)
  }, [getDeepSeek, updateEntry, markFinal])

  const stop = useCallback(() => {
    cancelledRef.current = true
    window.api.ytdlp.cancel()
  }, [])

  return { start, stop, getProgress: () => progressRef.current }
}

/**
 * Split a WAV ArrayBuffer (16kHz mono 16-bit) into chunk-sized WAV Blobs.
 * Each chunk gets a proper WAV header so Whisper API accepts it.
 * Properly parses WAV chunks to find the data payload (handles extra LIST/metadata chunks).
 */
function splitWavIntoChunks(wavBuffer: ArrayBuffer): ArrayBuffer[] {
  // Validate minimum WAV header size
  if (wavBuffer.byteLength < 44) {
    throw new Error(`WAV buffer too small: ${wavBuffer.byteLength} bytes (expected >= 44)`)
  }

  const view = new DataView(wavBuffer)

  // Verify RIFF/WAVE signature
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))
  if (riff !== 'RIFF' || wave !== 'WAVE') {
    throw new Error(`Invalid WAV signature: got "${riff}" / "${wave}", expected "RIFF" / "WAVE"`)
  }

  // Parse WAV chunks to find the "data" chunk
  let dataOffset = -1
  let dataSize = -1
  let offset = 12 // skip RIFF header

  while (offset + 8 <= wavBuffer.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3)
    )
    const chunkSize = view.getUint32(offset + 4, true)

    if (chunkId === 'data') {
      dataOffset = offset + 8
      dataSize = chunkSize
      break
    }

    // Skip to next chunk (chunks are 2-byte aligned)
    offset += 8 + chunkSize + (chunkSize % 2)
  }

  if (dataOffset < 0 || dataSize < 0) {
    throw new Error('WAV data chunk not found')
  }

  // Clamp dataSize to actual available bytes (some files may have inaccurate size)
  dataSize = Math.min(dataSize, wavBuffer.byteLength - dataOffset)

  console.log(`[splitWavIntoChunks] WAV data at offset=${dataOffset}, size=${dataSize}, duration=${(dataSize / (SAMPLE_RATE * BYTES_PER_SAMPLE)).toFixed(1)}s`)

  const pcmData = wavBuffer.slice(dataOffset, dataOffset + dataSize)
  const pcmBytes = pcmData.byteLength
  const chunkPcmBytes = CHUNK_DURATION_SEC * SAMPLE_RATE * BYTES_PER_SAMPLE
  const chunks: ArrayBuffer[] = []

  for (let pos = 0; pos < pcmBytes; pos += chunkPcmBytes) {
    const end = Math.min(pos + chunkPcmBytes, pcmBytes)
    const chunkPcm = pcmData.slice(pos, end)
    const header = buildWavHeader(chunkPcm.byteLength)
    const combined = new Uint8Array(header.byteLength + chunkPcm.byteLength)
    combined.set(new Uint8Array(header), 0)
    combined.set(new Uint8Array(chunkPcm), header.byteLength)
    chunks.push(combined.buffer)
  }

  return chunks
}

function buildWavHeader(dataSize: number): ArrayBuffer {
  const header = new ArrayBuffer(HEADER_SIZE)
  const v = new DataView(header)
  const blockAlign = BYTES_PER_SAMPLE // mono * 16-bit

  v.setUint32(0, 0x52494646, false)  // "RIFF"
  v.setUint32(4, dataSize + 36, true)
  v.setUint32(8, 0x57415645, false)  // "WAVE"
  v.setUint32(12, 0x666d7420, false) // "fmt "
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)           // PCM
  v.setUint16(22, 1, true)           // mono
  v.setUint32(24, SAMPLE_RATE, true)
  v.setUint32(28, SAMPLE_RATE * blockAlign, true)
  v.setUint16(32, blockAlign, true)
  v.setUint16(34, 16, true)          // 16-bit
  v.setUint32(36, 0x64617461, false) // "data"
  v.setUint32(40, dataSize, true)

  return header
}
