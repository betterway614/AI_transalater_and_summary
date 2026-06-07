import { useCallback } from 'react'
import { useVADCapture } from './useVADCapture'
import type { VADCaptureOptions } from './useVADCapture'
import { useAppStore } from '../store/appStore'

const log = (...args: unknown[]) => { console.log(...args); window.api?.logToMain('info', ...args) }
const logErr = (...args: unknown[]) => { console.error(...args); window.api?.logToMain('error', ...args) }

export type { VADCaptureOptions as SystemAudioOptions }

/**
 * System audio capture via getDisplayMedia().
 * Main process setDisplayMediaRequestHandler auto-approves with useSystemPicker: false.
 */
export function useSystemAudioCapture(options: VADCaptureOptions) {
  const { start: vadStart, stop, isCapturing, audioLevelRef } = useVADCapture(options)

  const start = useCallback(async () => {
    log('[SysAudio] ====== start() called ======')

    try {
      log('[SysAudio] Calling getDisplayMedia...')
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true as any,
          audio: true as any
        })
        log('[SysAudio] getDisplayMedia SUCCESS, tracks:', stream.getTracks().length, 'audio:', stream.getAudioTracks().length)
      } catch (e: any) {
        logErr(`[SysAudio] getDisplayMedia FAILED: ${e.name}: ${e.message}`)
        throw new Error(`无法获取系统音频: ${e.message || e.name}`)
      }

      // Stop video tracks immediately — keep only audio
      stream.getVideoTracks().forEach((t) => {
        t.stop()
        stream.removeTrack(t)
      })

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop())
        throw new Error('没有获取到系统音频轨道。请确保在分享时勾选了"分享系统音频"。')
      }

      const audioTrack = audioTracks[0]
      log('[SysAudio] Audio track:', audioTrack.label, 'settings:', JSON.stringify(audioTrack.getSettings()))

      await vadStart(stream)
    } catch (err: any) {
      logErr('[SysAudio] Failed to start:', err)
      useAppStore.getState().setStatus('error')
      throw err
    }
  }, [vadStart])

  return { start, stop, isCapturing, audioLevelRef }
}
