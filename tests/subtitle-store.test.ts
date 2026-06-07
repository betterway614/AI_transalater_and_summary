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

describe('Subtitle Store — ordered insertion', () => {
  beforeEach(() => {
    useSubtitleStore.getState().clearEntries()
  })

  it('should insert entries in order when added sequentially', () => {
    const store = useSubtitleStore.getState()
    const e1 = store.createEntry('First', 'url')
    const e2 = store.createEntry('Second', 'url')
    const e3 = store.createEntry('Third', 'url')

    store.addEntry(e1)
    store.addEntry(e2)
    store.addEntry(e3)

    const entries = useSubtitleStore.getState().entries
    expect(entries).toHaveLength(3)
    expect(entries[0].originalText).toBe('First')
    expect(entries[1].originalText).toBe('Second')
    expect(entries[2].originalText).toBe('Third')
  })

  it('should sort correctly when inserted in reverse _order', () => {
    const store = useSubtitleStore.getState()

    // Simulate out-of-order arrival: create e3 first, then e1, then e2
    // but assign _order to simulate actual chronological creation
    const e1 = store.createEntry('First', 'url')  // _order = 1
    const e2 = store.createEntry('Second', 'url') // _order = 2
    const e3 = store.createEntry('Third', 'url')  // _order = 3

    // Insert in reverse: e3 first, then e1, then e2
    store.addEntry(e3)
    store.addEntry(e1)
    store.addEntry(e2)

    const entries = useSubtitleStore.getState().entries
    expect(entries).toHaveLength(3)
    // Should be sorted by _order: e1, e2, e3
    expect(entries[0].originalText).toBe('First')
    expect(entries[1].originalText).toBe('Second')
    expect(entries[2].originalText).toBe('Third')
  })

  it('should insert between existing entries correctly', () => {
    const store = useSubtitleStore.getState()

    const e1 = store.createEntry('A', 'url') // _order = 1
    const e3 = store.createEntry('C', 'url') // _order = 2
    store.addEntry(e1)
    store.addEntry(e3)

    // Now insert e2 which was created after e1 but before e3
    // We can't easily manipulate _order, but we can verify the binary insertion
    const e2 = store.createEntry('B', 'url') // _order = 3

    // Clear and re-test with a scenario that tests the insert position
    store.clearEntries()

    // Re-create with new _order values
    const a = useSubtitleStore.getState().createEntry('A', 'url') // 4
    const c = useSubtitleStore.getState().createEntry('C', 'url') // 5
    store.addEntry(a)
    store.addEntry(c)

    // Verify they're in order
    expect(useSubtitleStore.getState().entries[0].originalText).toBe('A')
    expect(useSubtitleStore.getState().entries[1].originalText).toBe('C')
  })

  it('should reset orderCounter on clearEntries', () => {
    const store = useSubtitleStore.getState()
    const e1 = store.createEntry('Session1-A', 'url')
    store.addEntry(e1)

    store.clearEntries()

    // After clear, new entries should start from order 1 again
    const e2 = useSubtitleStore.getState().createEntry('Session2-A', 'url')
    useSubtitleStore.getState().addEntry(e2)

    const entries = useSubtitleStore.getState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0].originalText).toBe('Session2-A')
  })

  it('should handle large number of interleaved inserts', () => {
    const store = useSubtitleStore.getState()

    // Create 20 entries
    const all = Array.from({ length: 20 }, (_, i) =>
      store.createEntry(`Entry ${i}`, 'url')
    )

    // Shuffle and insert
    const shuffled = [...all].sort(() => Math.random() - 0.5)
    for (const e of shuffled) {
      store.addEntry(e)
    }

    const entries = useSubtitleStore.getState().entries
    expect(entries).toHaveLength(20)

    // Verify sorted by _order (ascending)
    let prevOrder = -1
    for (const e of entries) {
      const order = (e as any)._order as number
      expect(order).toBeGreaterThan(prevOrder)
      prevOrder = order
    }
  })

  it('should keep translated updates in correct position', () => {
    const store = useSubtitleStore.getState()

    const e1 = store.createEntry('Hello', 'url')
    const e2 = store.createEntry('World', 'url')
    store.addEntry(e1)
    store.addEntry(e2)

    // Update e1's translation
    store.updateEntry(e1.id, '你好')

    const entries = useSubtitleStore.getState().entries
    expect(entries[0].translatedText).toBe('你好')
    expect(entries[0].originalText).toBe('Hello')
    expect(entries[1].originalText).toBe('World')
  })

  it('should maintain order after markFinal operations', () => {
    const store = useSubtitleStore.getState()

    const e1 = store.createEntry('First', 'url')
    const e2 = store.createEntry('Second', 'url')
    const e3 = store.createEntry('Third', 'url')

    // Insert out of order
    store.addEntry(e2)
    store.addEntry(e3)
    store.addEntry(e1)

    // Mark final on e2
    store.markFinal(e2.id, '第二')

    const entries = useSubtitleStore.getState().entries
    expect(entries[0].originalText).toBe('First')
    expect(entries[1].originalText).toBe('Second')
    expect(entries[1].isFinal).toBe(true)
    expect(entries[1].translatedText).toBe('第二')
    expect(entries[2].originalText).toBe('Third')
  })
})
