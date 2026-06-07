import { execSync } from 'child_process'

/**
 * 在 Windows 上检测控制台编码并修复中文乱码问题。
 * 当控制台使用非 UTF-8 编码（如 CP936/GBK）时，将 stdout/stderr
 * 的字符串输出转码为控制台对应的编码，确保中文正常显示。
 */
export function configureConsoleEncoding(): void {
  if (process.platform !== 'win32') return

  let consoleEncoding = 'utf-8'
  try {
    const output = execSync('chcp', {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 1000,
    })
    const match = output.match(/(\d+)/)
    if (match) {
      const cp = parseInt(match[1], 10)
      const map: Record<number, string> = {
        936: 'gbk',
        950: 'big5',
        932: 'shift_jis',
        949: 'euc-kr',
        65001: 'utf-8',
      }
      consoleEncoding = map[cp] || 'utf-8'
    }
  } catch {
    return // chcp failed, nothing to fix
  }

  if (consoleEncoding === 'utf-8') return

  const iconv = require('iconv-lite')

  // 覆盖 stdout/stderr 的 write，将字符串转码为控制台编码
  for (const stream of [process.stdout, process.stderr]) {
    const origin = stream.write.bind(stream)
    stream.write = function (chunk: any, encoding?: any, cb?: any): boolean {
      if (typeof chunk === 'string') {
        return origin(iconv.encode(chunk, consoleEncoding), cb)
      }
      return origin(chunk, encoding, cb)
    }
  }
}
