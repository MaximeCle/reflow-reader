import { atom } from 'jotai'
import type { ExtractedDocument } from '../lib/pdf/types'
import type { Anchor, LibraryEntry } from '../lib/storage/types'

export interface ReaderState {
  entry: LibraryEntry
  document: ExtractedDocument
  /** Pages read so far while the PDF is still being extracted. */
  pagesProcessed: number
  extracting: boolean
}

export const readerAtom = atom<ReaderState | null>(null)

export const bookmarkAtom = atom(
  (get) => get(readerAtom)?.entry.bookmark ?? null,
  (get, set, bookmark: Anchor | null) => {
    const state = get(readerAtom)
    if (!state) return
    set(readerAtom, { ...state, entry: { ...state.entry, bookmark } })
  },
)

export const closeDocumentAtom = atom(null, (_get, set) => {
  set(readerAtom, null)
})
