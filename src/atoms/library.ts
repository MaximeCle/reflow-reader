import { atom } from 'jotai'
import { listLibrary, putEntry } from '../lib/storage/documents'
import type { LibraryEntry } from '../lib/storage/types'
import { mergeLibraryEntry } from '../lib/sync/mergeLibraryEntry'
import { reconcileLibraryWithSync } from '../lib/sync/syncedStorage'

export const libraryAtom = atom<LibraryEntry[]>([])

function byLastRead(entries: LibraryEntry[]): LibraryEntry[] {
  return [...entries].sort((a, b) => b.lastReadAt - a.lastReadAt)
}

export const refreshLibraryAtom = atom(null, async (_get, set) => {
  const local = await listLibrary()
  set(libraryAtom, byLastRead(await reconcileLibraryWithSync(local)))
})

/** Applied when another device's change arrives over the realtime channel. */
export const applyRemoteEntryAtom = atom(null, async (get, set, remote: LibraryEntry) => {
  const current = get(libraryAtom)
  const local = current.find((entry) => entry.id === remote.id)
  const merged = mergeLibraryEntry(local, remote)
  await putEntry(merged)

  const next = local
    ? current.map((entry) => (entry.id === remote.id ? merged : entry))
    : [...current, merged]
  set(libraryAtom, byLastRead(next))
})
