import log from 'electron-log'

export class SystemAudioService {
  private isCapturing = false

  start(onData: (data: Buffer) => void): void {
    if (this.isCapturing) return

    this.isCapturing = true
    log.info('[SystemAudio] Starting system audio capture')

    // V1: System audio capture via WASAPI requires native bindings
    // For now, this is a placeholder that signals the capture is active
    // The actual WASAPI/BlackHole integration will use a native Node addon
    // or spawn a separate audio capture process

    // TODO: Implement WASAPI loopback capture for Windows
    // TODO: Implement BlackHole/ScreenCaptureKit for macOS
  }

  stop(): void {
    if (!this.isCapturing) return
    this.isCapturing = false
    log.info('[SystemAudio] Stopping system audio capture')
  }

  getDevices(): string[] {
    // Placeholder: return default device
    // Real implementation would enumerate audio devices
    return ['系统默认音频输出']
  }
}
