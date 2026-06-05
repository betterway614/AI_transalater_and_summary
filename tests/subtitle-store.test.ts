import { describe, it, expect, beforeEach } from 'vitest'
import { useSubtitleStore } from '../src/renderer/src/store/subtitleStore'
import type { SubtitleEntry } from '../src/shared/types'

describe('Subtitle Store', () => {
  beforeEach(() => {
    useSubtitleStore.getState().clearEntries()
  })

  it('should create entry with correct fields', () => {
    const entry = useSubtitleStore.getState().createEntry('Hello world', 'microphone')

    expect(entry.originalText).toBe('Hello world')
    expect(entry.mode).toBe('microphone')
    expect(entry.isFinal).toBe(false)
    expect(entry.translatedText).toBe('')
    expect(entry.id).toMatch(/^sub_/)
    expect(entry.timestamp).toBeGreaterThan(0)
  })

  it('should add entry to store', () => {
    const store = useSubtitleStore.getState()
    const entry = store.createEntry('Test', 'url')
    store.addEntry(entry)

    expect(useSubtitleStore.getState().entries).toHaveLength(1)
    expect(useSubtitleStore.getState().entries[0].originalText).toBe('Test')
  })

  it('should update entry translation', () => {
    const store = useSubtitleStore.getState()
    const entry = store.createEntry('Hello', 'url')
    store.addEntry(entry)
    store.updateEntry(entry.id, '你好')

    expect(useSubtitleStore.getState().entries[0].translatedText).toBe('你好')
  })

  it('should replace last non-final entry', () => {
    const store = useSubtitleStore.getState()
    const entry1 = store.createEntry('First', 'url')
    store.addEntry(entry1)

    const replacement: SubtitleEntry = {
      ...entry1,
      originalText: 'First (corrected)',
      translatedText: '第一个（已修正）'
    }
    store.replaceLastEntry(replacement)

    const entries = useSubtitleStore.getState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0].originalText).toBe('First (corrected)')
  })

  it('should append when last entry is final', () => {
    const store = useSubtitleStore.getState()
    const entry1: SubtitleEntry = {
      ...store.createEntry('First', 'url'),
      isFinal: true,
      translatedText: '第一个'
    }
    store.addEntry(entry1)

    const entry2: SubtitleEntry = {
      ...store.createEntry('Second', 'url'),
      isFinal: false
    }
    store.replaceLastEntry(entry2)

    const entries = useSubtitleStore.getState().entries
    expect(entries).toHaveLength(2)
    expect(entries[0].originalText).toBe('First')
    expect(entries[1].originalText).toBe('Second')
  })

  it('should clear all entries', () => {
    const store = useSubtitleStore.getState()
    store.addEntry(store.createEntry('A', 'url'))
    store.addEntry(store.createEntry('B', 'url'))

    expect(useSubtitleStore.getState().entries).toHaveLength(2)

    store.clearEntries()
    expect(useSubtitleStore.getState().entries).toHaveLength(0)
  })

  it('should generate unique IDs', () => {
    const store = useSubtitleStore.getState()
    const e1 = store.createEntry('A', 'url')
    const e2 = store.createEntry('B', 'url')

    expect(e1.id).not.toBe(e2.id)
  })
})
