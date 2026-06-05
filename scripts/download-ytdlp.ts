/**
 * Download yt-dlp and ffmpeg binaries for the current platform
 * Usage: npx tsx scripts/download-ytdlp.ts
 */
import { execSync } from 'child_process'
import { existsSync, mkdirSync, chmodSync } from 'fs'
import { join, resolve } from 'path'
import { platform, arch } from 'os'
import https from 'https'
import http from 'http'
import { createWriteStream } from 'fs'

const ROOT = resolve(__dirname, '..')
const BIN_DIR = join(ROOT, 'resources', 'bin')

const YTDLP_VERSION = '2024.12.23'

function getPlatformInfo() {
  const p = platform()
  const a = arch()

  if (p === 'win32') {
    return {
      ytdlpUrl: `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp.exe`,
      ytdlpName: 'yt-dlp.exe',
      ffmpegUrl: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
      ffmpegName: 'ffmpeg.exe'
    }
  } else if (p === 'darwin') {
    return {
      ytdlpUrl: `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_macos`,
      ytdlpName: 'yt-dlp',
      ffmpegUrl: null, // macOS: brew install ffmpeg
      ffmpegName: null
    }
  } else {
    return {
      ytdlpUrl: `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp`,
      ytdlpName: 'yt-dlp',
      ffmpegUrl: null,
      ffmpegName: null
    }
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`  Downloading: ${url}`)
    console.log(`  To: ${dest}`)

    const client = url.startsWith('https') ? https : http
    const request = (res: any) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        const redirClient = res.headers.location.startsWith('https') ? https : http
        redirClient.get(res.headers.location, request).on('error', reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }

      const file = createWriteStream(dest)
      const total = parseInt(res.headers['content-length'] || '0', 10)
      let downloaded = 0

      res.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        if (total > 0) {
          const pct = ((downloaded / total) * 100).toFixed(1)
          process.stdout.write(`\r  Progress: ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)}MB)`)
        }
      })

      res.pipe(file)
      file.on('finish', () => {
        file.close()
        console.log('\n  Done!')
        resolve()
      })
      file.on('error', (err) => {
        file.close()
        reject(err)
      })
    }

    client.get(url, request).on('error', reject)
  })
}

async function main() {
  console.log('=== Download yt-dlp binary ===\n')

  if (!existsSync(BIN_DIR)) {
    mkdirSync(BIN_DIR, { recursive: true })
  }

  const info = getPlatformInfo()
  const ytdlpPath = join(BIN_DIR, info.ytdlpName)

  // Download yt-dlp
  if (existsSync(ytdlpPath)) {
    console.log(`yt-dlp already exists at: ${ytdlpPath}`)
  } else {
    console.log(`Downloading yt-dlp v${YTDLP_VERSION}...`)
    await downloadFile(info.ytdlpUrl, ytdlpPath)

    // Make executable on Unix
    if (platform() !== 'win32') {
      chmodSync(ytdlpPath, 0o755)
    }
  }

  // Check ffmpeg
  const ffmpegPath = join(BIN_DIR, info.ffmpegName || 'ffmpeg')
  if (info.ffmpegUrl && !existsSync(ffmpegPath)) {
    console.log('\nNote: ffmpeg is required for some URL audio extractions.')
    console.log('On Windows, download ffmpeg manually from: https://github.com/BtbN/FFmpeg-Builds/releases')
    console.log(`Place ffmpeg.exe in: ${BIN_DIR}`)
  }

  // Verify
  console.log('\n=== Verification ===')
  try {
    const output = execSync(`"${ytdlpPath}" --version`, { timeout: 10000 }).toString().trim()
    console.log(`yt-dlp version: ${output}`)
  } catch (err: any) {
    console.error(`Failed to run yt-dlp: ${err.message}`)
  }

  console.log('\nDone!')
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
