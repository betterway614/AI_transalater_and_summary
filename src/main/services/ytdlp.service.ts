import { execFile, ChildProcess } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import { readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import log from 'electron-log'
import { resolveBinary } from '../utils/paths'
import { getPlatformBinary } from '../utils/platform'
import type { VideoInfo, VideoPart } from '../../shared/types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export interface ExtractOptions {
  url: string
  partIndex?: number // 0-based, undefined = first part
  cookiesPath?: string
}

export class YtdlpService {
  private process: ChildProcess | null = null
  private ytdlpPath: string
  private ffmpegPath: string | null
  private cookiesPath: string | null = null

  constructor() {
    this.ytdlpPath = resolveBinary(getPlatformBinary('yt-dlp')) ?? getPlatformBinary('yt-dlp')
    this.ffmpegPath = resolveBinary(getPlatformBinary('ffmpeg'))
  }

  setCookies(path: string | null): void {
    this.cookiesPath = path && existsSync(path) ? path : null
    log.info('[yt-dlp] Cookies:', this.cookiesPath ?? 'none')
  }

  async getVideoInfo(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json', '--no-download',
        '--user-agent', USER_AGENT,
        ...this.getCookieArgs(),
        url
      ]

      const proc = execFile(this.ytdlpPath, args, { timeout: 30000 })

      let stdout = ''
      proc.stdout?.on('data', (data) => { stdout += data.toString() })

      let stderr = ''
      proc.stderr?.on('data', (data) => { stderr += data.toString() })

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(this.parseError(stderr, code)))
          return
        }

        try {
          const lines = stdout.trim().split('\n').filter(Boolean)
          const entries = lines.map((l) => JSON.parse(l))
          const first = entries[0]
          const isPlaylist = entries.length > 1 || first.playlist || first.playlist_index

          const parts: VideoPart[] = isPlaylist
            ? entries.map((e: any, i: number) => ({
                index: i,
                title: e.title || `Part ${i + 1}`,
                duration: e.duration || 0
              }))
            : [{ index: 0, title: first.title, duration: first.duration || 0 }]

          resolve({
            title: first.title || 'Unknown',
            duration: first.duration || 0,
            uploader: first.uploader || first.channel || '',
            partCount: parts.length,
            parts,
            siteName: first.extractor_key || first.extractor || 'Unknown'
          })
        } catch {
          reject(new Error('Failed to parse video info'))
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
    options: ExtractOptions,
    onProgress: (progress: number) => void
  ): Promise<Buffer> {
    const { url, partIndex, cookiesPath } = options
    const timestamp = Date.now()
    const rawFile = join(tmpdir(), `ytdlp-raw-${timestamp}`)
    const wavFile = join(tmpdir(), `ytdlp-audio-${timestamp}.wav`)

    // Build playlist args: select specific part if specified
    const playlistArgs = partIndex != null
      ? ['--playlist-items', String(partIndex + 1)] // yt-dlp uses 1-based
      : ['--no-playlist']

    const effectiveCookies = cookiesPath && existsSync(cookiesPath) ? cookiesPath : this.cookiesPath
    const cookieArgs = effectiveCookies ? ['--cookies', effectiveCookies] : []

    return new Promise((resolve, reject) => {
      this.process = execFile(
        this.ytdlpPath,
        [
          '-x',
          '--user-agent', USER_AGENT,
          ...cookieArgs,
          ...playlistArgs,
          '-o', rawFile, url
        ],
        { timeout: 300000 }
      )

      let stderr = ''
      this.process.stderr?.on('data', (data) => {
        const text = data.toString()
        stderr += text
        const match = text.match(/(\d+\.?\d*)%/)
        if (match) onProgress(parseFloat(match[1]) * 0.8)
        log.info('[yt-dlp]', text.trim())
      })

      this.process.on('close', async (code) => {
        this.process = null
        if (code !== 0) {
          await this.cleanup(rawFile, wavFile)
          reject(new Error(this.parseError(stderr, code)))
          return
        }

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

      this.process.on('error', (err) => {
        this.process = null
        reject(new Error(
          `Failed to run yt-dlp: ${err.message}\n` +
          'Please install yt-dlp or run: npx tsx scripts/download-ytdlp.ts'
        ))
      })
    })
  }

  private getCookieArgs(): string[] {
    if (this.cookiesPath && existsSync(this.cookiesPath)) {
      return ['--cookies', this.cookiesPath]
    }
    return []
  }

  private parseError(stderr: string, code: number | null): string {
    const s = stderr.toLowerCase()

    if (s.includes('412') || s.includes('precondition failed')) {
      return '访问被拒绝（HTTP 412）。B站等平台需要登录，请在设置中配置 cookies 文件路径。\n' +
        '获取方式：浏览器登录后用 "Get cookies.txt LOCALLY" 扩展导出 cookies.txt'
    }
    if (s.includes('login') || s.includes('sign in') || s.includes('403')) {
      return '需要登录才能访问此内容。请在设置中配置 cookies 文件路径。'
    }
    if (s.includes('geo') || s.includes('not available in your country')) {
      return '此视频在当前地区不可用。'
    }
    if (s.includes('private video') || s.includes('video is private')) {
      return '这是一个私有视频，无法访问。'
    }
    if (s.includes('video is unavailable') || s.includes('removed')) {
      return '视频不可用或已被删除。'
    }
    if (s.includes('premium') || s.includes('付费')) {
      return '此内容需要付费/大会员。请配置已登录的 cookies 文件。'
    }

    return `yt-dlp 退出码 ${code}：${stderr.trim().split('\n').pop() || 'Unknown error'}`
  }

  private convertToWav(source: string, dest: string, onProgress: (p: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = execFile(this.ffmpegPath!, [
        '-y', '-i', source,
        '-ar', '16000', '-ac', '1', '-acodec', 'pcm_s16le',
        dest
      ], { timeout: 120000 })

      proc.stderr?.on('data', (data) => {
        const match = data.toString().match(/time=(\d+):(\d+):(\d+)/)
        if (match) {
          const seconds = +match[1] * 3600 + +match[2] * 60 + +match[3]
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
    for (const ext of ['.m4a', '.wav', '.opus', '.ogg', '.webm', '.mp3', '.aac', '.flac']) {
      if (existsSync(basePath + ext)) return basePath + ext
    }
    if (existsSync(basePath)) return basePath
    return null
  }

  private async cleanup(...files: string[]): Promise<void> {
    for (const f of files) await unlink(f).catch(() => {})
  }

  cancel(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }
}
