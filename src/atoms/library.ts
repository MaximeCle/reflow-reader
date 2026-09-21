import { atom } from 'jotai'
import { listLibrary } from '../lib/storage/documents'
import type { LibraryEntry } from '../lib/storage/types'

export const libraryAtom = atom<LibraryEntry[]>([])

export const refreshLibraryAtom = atom(null, async (_get, set) => {
  set(libraryAtom, await listLibrary())
})
