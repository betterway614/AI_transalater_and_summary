import { execFile, ChildProcess } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import { readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import log from 'electron-log'
import { resolveBinary } from '../utils/paths'
import { getPlatformBinary } from '../utils/platform'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export class YtdlpService {
  private process: ChildProcess | null = null
  private ytdlpPath: string
  private ffmpegPath: string | null

  constructor() {
    this.ytdlpPath = resolveBinary(getPlatformBinary('yt-dlp')) ?? getPlatformBinary('yt-dlp')
    this.ffmpegPath = resolveBinary(getPlatformBinary('ffmpeg'))
  }

  async getVideoInfo(url: string): Promise<{ title: string; duration: number }> {
    return new Promise((resolve, reject) => {
      const proc = execFile(
        this.ytdlpPath,
        ['--dump-json', '--no-download', '--user-agent', USER_AGENT, url],
        { timeout: 30000 }
      )

      let stdout = ''
      proc.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      proc.on('close', (code) => {
        if (code === 0) {
          try {
            // Bilibili anthology returns multiple JSON lines; take the first
            const firstLine = stdout.trim().split('\n')[0]
            const info = JSON.parse(firstLine)
            resolve({ title: info.title, duration: info.duration })
          } catch {
            reject(new Error('Failed to parse video info'))
          }
        } else {
          reject(new Error(`yt-dlp exited with code ${code}`))
        }
      })

      proc.on('error', (err) => {
        reject(new Error(
          `Failed to run yt-dlp: ${err.message}\n` +
          'Please install yt-dlp or run: npx tsx scripts/download-ytdlp.ts'
        ))
      })
    })
  }

  async extractAudio(
    url: string,
    onProgress: (progress: number) => void
  ): Promise<Buffer> {
    const timestamp = Date.now()
    const rawFile = join(tmpdir(), `ytdlp-raw-${timestamp}`)
    const wavFile = join(tmpdir(), `ytdlp-audio-${timestamp}.wav`)

    return new Promise((resolve, reject) => {
      // Step 1: download audio (original format) to temp file
      this.process = execFile(
        this.ytdlpPath,
        [
          '-x', '--no-playlist',
          '--user-agent', USER_AGENT,
          '-o', rawFile, url
        ],
        { timeout: 300000 }
      )

      this.process.stderr?.on('data', (data) => {
        const text = data.toString()
        const match = text.match(/(\d+\.?\d*)%/)
        if (match) onProgress(parseFloat(match[1]) * 0.8) // 0-80% for download
        log.info('[yt-dlp]', text.trim())
      })

      this.process.on('close', async (code) => {
        this.process = null
        if (code !== 0) {
          await this.cleanup(rawFile, wavFile)
          reject(new Error(`yt-dlp exited with code ${code}`))
          return
        }

        // Step 2: convert to 16kHz mono WAV (optimized for Whisper API)
        try {
          const source = this.findDownloadedFile(rawFile)
          if (!source) {
            reject(new Error('Downloaded audio file not found'))
            return
          }

          if (this.ffmpegPath) {
            await this.convertToWav(source, wavFile, onProgress)
            await unlink(source).catch(() => {})
            const buf = await readFile(wavFile)
            await unlink(wavFile).catch(() => {})
            resolve(buf)
          } else {
            // No ffmpeg: use the raw file as-is
            log.warn('[yt-dlp] ffmpeg not found, returning raw audio format')
            const buf = await readFile(source)
            await unlink(source).catch(() => {})
            resolve(buf)
          }
        } catch (err: any) {
          await this.cleanup(rawFile, wavFile)
          reject(new Error(`Audio conversion failed: ${err.message}`))
        }
      })

      this.process.on('error', async (err) => {
        this.process = null
        reject(new Error(
          `Failed to run yt-dlp: ${err.message}\n` +
          'Please install yt-dlp or run: npx tsx scripts/download-ytdlp.ts'
        ))
      })
    })
  }

  private convertToWav(source: string, dest: string, onProgress: (p: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      // Resample to 16kHz mono — Whisper optimal format, ~7x smaller than 44.1kHz stereo
      const proc = execFile(this.ffmpegPath!, [
        '-y', '-i', source,
        '-ar', '16000', '-ac', '1', '-acodec', 'pcm_s16le',
        dest
      ], { timeout: 120000 })

      proc.stderr?.on('data', (data) => {
        const text = data.toString()
        // ffmpeg progress: "time=00:01:23.45"
        const match = text.match(/time=(\d+):(\d+):(\d+)/)
        if (match) {
          const seconds = +match[1] * 3600 + +match[2] * 60 + +match[3]
          // Map to 80-100% range (conversion phase)
          onProgress(80 + Math.min(19, Math.round((seconds / 720) * 19)))
        }
      })

      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`ffmpeg exited with code ${code}`))
      })

      proc.on('error', (err) => {
        reject(new Error(`Failed to run ffmpeg: ${err.message}`))
      })
    })
  }

  private findDownloadedFile(basePath: string): string | null {
    // yt-dlp may append extension or save as-is
    for (const ext of ['.m4a', '.wav', '.opus', '.ogg', '.webm', '.mp3', '.aac', '.flac']) {
      const path = basePath + ext
      if (existsSync(path)) return path
    }
    if (existsSync(basePath)) return basePath
    return null
  }

  private async cleanup(...files: string[]): Promise<void> {
    for (const f of files) {
      await unlink(f).catch(() => {})
    }
  }

  cancel(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }
}
