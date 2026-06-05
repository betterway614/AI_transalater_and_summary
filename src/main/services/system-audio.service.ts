import { ChildProcess, spawn } from 'child_process'
import log from 'electron-log'
import { resolveBinary } from '../utils/paths'
import { getPlatformBinary } from '../utils/platform'

/**
 * System audio capture using WASAPI Loopback on Windows.
 *
 * Strategy:
 * 1. Primary: Use sox with WASAPI loopback
 * 2. Fallback: Use ffmpeg with WASAPI
 * 3. Graceful degradation with user guidance if neither works
 */
export class SystemAudioService {
  private process: ChildProcess | null = null
  private isCapturing = false

  start(onData: (data: Buffer) => void): void {
    if (this.isCapturing) return

    // Strategy 1: Try sox with WASAPI loopback
    const soxPath = resolveBinary(getPlatformBinary('sox'))
    if (soxPath) {
      this.startWithSox(soxPath, onData)
      return
    }

    // Strategy 2: Try ffmpeg with WASAPI
    const ffmpegPath = resolveBinary(getPlatformBinary('ffmpeg'))
    if (ffmpegPath) {
      this.startWithFfmpeg(ffmpegPath, onData)
      return
    }

    // Strategy 3: Fallback - no system audio capture available
    throw new Error(
      '系统音频捕获需要安装 sox 或 ffmpeg 工具。\n' +
      '请将 sox.exe 或 ffmpeg.exe 放置到 resources/bin/ 目录下，或确保它们在系统 PATH 中。\n' +
      '下载地址: https://github.com/yt-dlp/FFmpeg-Builds/releases'
    )
  }

  private startWithSox(soxPath: string, onData: (data: Buffer) => void): void {
    log.info('[SystemAudio] Starting with sox WASAPI loopback')

    this.process = spawn(soxPath, [
      '-t', 'wasapi', 'default',  // WASAPI loopback capture
      '-t', 'raw',                 // Raw PCM output (no WAV header)
      '-e', 'signed-integer',      // Signed 16-bit PCM
      '-b', '16',
      '-r', '16000',              // 16kHz
      '-c', '1',                   // Mono
      '-'                          // Output to stdout
    ])

    this.setupProcessHandlers(this.process, onData)
    this.isCapturing = true
  }

  private startWithFfmpeg(ffmpegPath: string, onData: (data: Buffer) => void): void {
    log.info('[SystemAudio] Starting with ffmpeg WASAPI')

    this.process = spawn(ffmpegPath, [
      '-f', 'wasapi',              // WASAPI (Windows loopback)
      '-i', 'default',             // Default audio output device
      '-ar', '16000',              // Sample rate
      '-ac', '1',                  // Mono
      '-f', 's16le',              // Raw signed 16-bit little-endian PCM
      '-acodec', 'pcm_s16le',     // 16-bit PCM
      'pipe:1'                     // Output to stdout
    ], { stdio: ['pipe', 'pipe', 'pipe'] })

    this.setupProcessHandlers(this.process, onData)
    this.isCapturing = true
  }

  private setupProcessHandlers(proc: ChildProcess, onData: (data: Buffer) => void): void {
    let buffer = Buffer.alloc(0)
    const SAMPLE_RATE = 16000
    const BYTES_PER_SAMPLE = 2 // 16-bit
    const CHUNK_SECONDS = 3
    const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHUNK_SECONDS

    proc.stdout?.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk])

      while (buffer.length >= CHUNK_SIZE) {
        const pcmData = buffer.subarray(0, CHUNK_SIZE)
        buffer = buffer.subarray(CHUNK_SIZE)
        const wavChunk = this.buildWavBuffer(pcmData, SAMPLE_RATE)
        onData(wavChunk)
      }
    })

    proc.stderr?.on('data', (data) => {
      log.info('[SystemAudio]', data.toString().trim())
    })

    proc.on('close', (code) => {
      this.isCapturing = false
      this.process = null
      log.info(`[SystemAudio] Process exited with code ${code}`)
    })

    proc.on('error', (err) => {
      this.isCapturing = false
      this.process = null
      log.error('[SystemAudio] Process error:', err.message)
    })
  }

  stop(): void {
    if (!this.isCapturing) return
    this.isCapturing = false

    if (this.process) {
      // Send SIGTERM first, then SIGKILL if needed
      this.process.kill('SIGTERM')
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL')
        }
        this.process = null
      }, 2000)
    }

    log.info('[SystemAudio] Stopped')
  }

  private buildWavBuffer(pcmData: Buffer, sampleRate: number): Buffer {
    const numChannels = 1
    const bitsPerSample = 16
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
    const blockAlign = numChannels * (bitsPerSample / 8)
    const dataSize = pcmData.length
    const headerSize = 44
    const totalSize = headerSize + dataSize

    const header = Buffer.alloc(headerSize)
    // RIFF header
    header.write('RIFF', 0)
    header.writeUInt32LE(totalSize - 8, 4)
    header.write('WAVE', 8)
    // fmt chunk
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16)       // chunk size
    header.writeUInt16LE(1, 20)        // PCM format
    header.writeUInt16LE(numChannels, 22)
    header.writeUInt32LE(sampleRate, 24)
    header.writeUInt32LE(byteRate, 28)
    header.writeUInt16LE(blockAlign, 32)
    header.writeUInt16LE(bitsPerSample, 34)
    // data chunk
    header.write('data', 36)
    header.writeUInt32LE(dataSize, 40)

    return Buffer.concat([header, pcmData])
  }

  getDevices(): string[] {
    // Return available audio output devices
    // Real implementation would use Windows Core Audio API
    return ['系统默认音频输出 (WASAPI Loopback)']
  }
}
