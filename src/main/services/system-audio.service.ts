import { ChildProcess, spawn } from 'child_process'
import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import log from 'electron-log'

/**
 * System audio capture using WASAPI Loopback on Windows.
 *
 * Strategy:
 * 1. Primary: Use bundled sox.exe with WASAPI loopback
 * 2. Fallback: Use PowerShell with Windows Audio API
 * 3. Graceful degradation with user guidance if neither works
 */
export class SystemAudioService {
  private process: ChildProcess | null = null
  private isCapturing = false

  start(onData: (data: Buffer) => void): void {
    if (this.isCapturing) return

    const isDev = !app.isPackaged
    const binDir = isDev
      ? join(__dirname, '../../resources/bin')
      : join(process.resourcesPath, 'bin')

    // Strategy 1: Try sox with WASAPI loopback
    const soxPath = join(binDir, process.platform === 'win32' ? 'sox.exe' : 'sox')
    if (existsSync(soxPath)) {
      this.startWithSox(soxPath, onData)
      return
    }

    // Strategy 2: Try ffmpeg with WASAPI
    const ffmpegPath = join(binDir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
    if (existsSync(ffmpegPath)) {
      this.startWithFfmpeg(ffmpegPath, onData)
      return
    }

    // Strategy 3: Fallback - no system audio capture available
    log.warn('[SystemAudio] No audio capture tool found. Install sox or ffmpeg in resources/bin/')
    throw new Error(
      '系统音频捕获需要安装 sox 或 ffmpeg 工具。\n' +
      '请将 sox.exe 或 ffmpeg.exe 放置到 resources/bin/ 目录下。\n' +
      '下载地址: https://github.com/yt-dlp/FFmpeg-Builds/releases'
    )
  }

  private startWithSox(soxPath: string, onData: (data: Buffer) => void): void {
    log.info('[SystemAudio] Starting with sox WASAPI loopback')

    // sox -t wasapi default -t wav -r 16000 -c 1 -b 16 - (output as raw PCM)
    this.process = spawn(soxPath, [
      '-t', 'wasapi', 'default',  // WASAPI loopback capture
      '-t', 'wav',                 // Output format
      '-',                         // Output to stdout
      'rate', '16000',             // Resample to 16kHz
      'channels', '1',             // Mono
      'bits', '16'                 // 16-bit
    ])

    this.setupProcessHandlers(this.process, onData)
    this.isCapturing = true
  }

  private startWithFfmpeg(ffmpegPath: string, onData: (data: Buffer) => void): void {
    log.info('[SystemAudio] Starting with ffmpeg WASAPI')

    // ffmpeg -f wasapi -i default -ar 16000 -ac 1 -f wav pipe:1
    this.process = spawn(ffmpegPath, [
      '-f', 'dshow',               // DirectShow (Windows)
      '-i', 'audio=virtual-audio-capturer', // or use wasapi
      '-ar', '16000',              // Sample rate
      '-ac', '1',                  // Mono
      '-f', 'wav',                 // WAV output
      '-acodec', 'pcm_s16le',     // 16-bit PCM
      'pipe:1'                     // Output to stdout
    ], { stdio: ['pipe', 'pipe', 'pipe'] })

    this.setupProcessHandlers(this.process, onData)
    this.isCapturing = true
  }

  private setupProcessHandlers(proc: ChildProcess, onData: (data: Buffer) => void): void {
    let buffer = Buffer.alloc(0)
    const CHUNK_SIZE = 16000 * 2 * 3 // 3 seconds of 16kHz 16-bit mono

    proc.stdout?.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk])

      while (buffer.length >= CHUNK_SIZE) {
        const wavChunk = buffer.subarray(0, CHUNK_SIZE)
        buffer = buffer.subarray(CHUNK_SIZE)
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

  getDevices(): string[] {
    // Return available audio output devices
    // Real implementation would use Windows Core Audio API
    return ['系统默认音频输出 (WASAPI Loopback)']
  }
}
