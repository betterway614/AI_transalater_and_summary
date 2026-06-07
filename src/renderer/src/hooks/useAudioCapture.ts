import { useCallback } from 'react'
import { useVADCapture } from './useVADCapture'
import type { VADCaptureOptions } from './useVADCapture'
import { useSettingsStore } from '../store/settingsStore'

const log = (...args: unknown[]) => { console.log(...args); window.api?.logToMain('info', ...args) }
const logErr = (...args: unknown[]) => { console.error(...args); window.api?.logToMain('error', ...args) }

export type { VADCaptureOptions as AudioCaptureOptions }

export function useAudioCapture(options: VADCaptureOptions) {
  const { start: vadStart, stop, isCapturing, audioLevelRef } = useVADCapture(options)

  const start = useCallback(async () => {
    log('[MicCapture] ====== start() called ======')
    const settings = useSettingsStore.getState().settings
    const sampleRate = settings.audio.sampleRate || 16000
    const inputDevice = settings.audio.inputDevice

    const audioConstraints: MediaTrackConstraints = {
      sampleRate,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true
    }

    if (inputDevice && inputDevice !== 'default') {
      audioConstraints.deviceId = { exact: inputDevice }
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints
    })

    const audioTrack = stream.getAudioTracks()[0]
    log('[MicCapture] getUserMedia success, track:', audioTrack?.label, 'settings:', JSON.stringify(audioTrack?.getSettings()))

    await vadStart(stream)
  }, [vadStart])

  return { start, stop, isCapturing, audioLevelRef }
}
