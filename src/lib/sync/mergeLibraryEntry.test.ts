import { describe, expect, it } from 'vitest'
import { mergeLibraryEntry } from './mergeLibraryEntry'
import type { LibraryEntry } from '../storage/types'

function entry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id: 'doc-1',
    title: 'Un livre',
    pageCount: 10,
    addedAt: 1000,
    lastReadAt: 1000,
    progress: 0,
    bookmark: null,
    readingPosition: null,
    ...overrides,
  }
}

describe('mergeLibraryEntry', () => {
  it('adopte lentrée distante quand il ny a rien en local', () => {
    const remote = entry({ lastReadAt: 500 })
    expect(mergeLibraryEntry(undefined, remote)).toBe(remote)
  })

  it('garde le local sil est plus récent', () => {
    const local = entry({ lastReadAt: 2000, progress: 0.8 })
    const remote = entry({ lastReadAt: 1000, progress: 0.2 })
    expect(mergeLibraryEntry(local, remote)).toBe(local)
  })

  it('adopte le distant sil est plus récent', () => {
    const local = entry({ lastReadAt: 1000, progress: 0.2 })
    const remote = entry({ lastReadAt: 2000, progress: 0.8 })
    expect(mergeLibraryEntry(local, remote)).toBe(remote)
  })

  it('adopte le distant à égalité de date', () => {
    const local = entry({ lastReadAt: 1000, title: 'Local' })
    const remote = entry({ lastReadAt: 1000, title: 'Distant' })
    expect(mergeLibraryEntry(local, remote)).toBe(remote)
  })

  it('ne mélange pas les champs dune entrée plus ancienne', () => {
    const local = entry({ lastReadAt: 2000, bookmark: { blockId: 'b1', charOffset: 4 } })
    const remote = entry({ lastReadAt: 1000, title: 'Titre renommé ailleurs' })

    const merged = mergeLibraryEntry(local, remote)

    expect(merged.bookmark).toEqual({ blockId: 'b1', charOffset: 4 })
    expect(merged.title).toBe('Un livre')
  })
})
