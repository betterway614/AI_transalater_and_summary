import { execFile, ChildProcess } from 'child_process'
import log from 'electron-log'
import { getBinPath } from '../utils/paths'
import { getPlatformBinary } from '../utils/platform'

export class YtdlpService {
  private process: ChildProcess | null = null
  private ytdlpPath: string

  constructor() {
    this.ytdlpPath = getBinPath(getPlatformBinary('yt-dlp'))
  }

  async getVideoInfo(url: string): Promise<{ title: string; duration: number }> {
    return new Promise((resolve, reject) => {
      const proc = execFile(this.ytdlpPath, ['--dump-json', '--no-download', url], {
        timeout: 30000
      })

      let stdout = ''
      proc.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      proc.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdout)
            resolve({ title: info.title, duration: info.duration })
          } catch {
            reject(new Error('Failed to parse video info'))
          }
        } else {
          reject(new Error(`yt-dlp exited with code ${code}`))
        }
      })

      proc.on('error', (err) => {
        reject(new Error(`Failed to run yt-dlp: ${err.message}`))
      })
    })
  }

  extractAudio(
    url: string,
    onProgress: (progress: number) => void,
    onAudioData: (data: Buffer) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = execFile(
        this.ytdlpPath,
        ['-x', '--audio-format', 'wav', '--audio-quality', '0', '-o', '-', '--no-playlist', url],
        { maxBuffer: 1024 * 1024 * 50 }
      )

      this.process.stdout?.on('data', (chunk: Buffer) => {
        onAudioData(chunk)
      })

      this.process.stderr?.on('data', (data) => {
        const text = data.toString()
        const match = text.match(/(\d+\.?\d*)%/)
        if (match) onProgress(parseFloat(match[1]))
        log.info('[yt-dlp]', text.trim())
      })

      this.process.on('close', (code) => {
        this.process = null
        if (code === 0) resolve()
        else reject(new Error(`yt-dlp exited with code ${code}`))
      })

      this.process.on('error', (err) => {
        this.process = null
        reject(new Error(`Failed to run yt-dlp: ${err.message}`))
      })
    })
  }

  cancel(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }
}
