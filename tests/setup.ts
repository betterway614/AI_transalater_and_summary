// Polyfill Blob.arrayBuffer for jsdom test environment
import { vi } from 'vitest'

if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    const reader = new FileReader()
    return new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(this)
    })
  }
}

// Shared mock factory for window.api
export function createMockApi() {
  return {
    store: {
      get: vi.fn(),
      set: vi.fn(),
      getSecret: vi.fn(),
      setSecret: vi.fn(),
      getStats: vi.fn(),
      cleanup: vi.fn(),
    },
    floating: {
      updateSubtitles: vi.fn(),
      updateTheme: vi.fn(),
      updateSummary: vi.fn(),
      setDisplayMode: vi.fn(),
    },
    ai: {
      transcribe: vi.fn(),
      chatCompletion: vi.fn(),
      testConnection: vi.fn(),
    },
    logToMain: vi.fn(),
  }
}

// Default mock with sensible return values
export function installDefaultMock() {
  const mockApi = createMockApi()
  mockApi.store.get.mockResolvedValue(null)
  mockApi.store.set.mockResolvedValue({ success: true })
  mockApi.store.getSecret.mockResolvedValue(null)
  mockApi.store.setSecret.mockResolvedValue(undefined)
  mockApi.store.getStats.mockResolvedValue({
    domains: {},
    historyCount: 0,
    oldestSessionTime: null,
    totalSize: 0,
  })
  mockApi.store.cleanup.mockResolvedValue(undefined)
  mockApi.floating.updateSubtitles.mockResolvedValue(true)
  mockApi.floating.updateTheme.mockResolvedValue(true)
  mockApi.floating.updateSummary.mockResolvedValue(true)
  mockApi.logToMain.mockImplementation(() => {})
  Object.defineProperty(window, 'api', { value: mockApi, writable: true })
  return mockApi
}
