import { describe, expect, it } from 'vitest'
import { fromLibraryEntryRow, toLibraryEntryRow } from './libraryEntryRow'
import type { LibraryEntry } from '../storage/types'

const entry: LibraryEntry = {
  id: 'doc-1',
  title: 'Un livre',
  pageCount: 42,
  addedAt: 1000,
  lastReadAt: 2000,
  progress: 0.5,
  bookmark: { blockId: 'b3', charOffset: 12 },
  readingPosition: { blockId: 'b1', charOffset: 0 },
}

describe('toLibraryEntryRow / fromLibraryEntryRow', () => {
  it('fait laller-retour sans perte', () => {
    const row = toLibraryEntryRow('B3F9-KQ2R-88ZP-MNBV', entry)
    expect(fromLibraryEntryRow(row)).toEqual(entry)
  })

  it('porte le code de synchro sur la ligne', () => {
    expect(toLibraryEntryRow('B3F9-KQ2R-88ZP-MNBV', entry).code).toBe('B3F9-KQ2R-88ZP-MNBV')
  })

  it('conserve des marque-pages absents', () => {
    const withoutAnchors: LibraryEntry = { ...entry, bookmark: null, readingPosition: null }
    const row = toLibraryEntryRow('CODE', withoutAnchors)
    expect(row.bookmark).toBeNull()
    expect(row.reading_position).toBeNull()
    expect(fromLibraryEntryRow(row)).toEqual(withoutAnchors)
  })
})
