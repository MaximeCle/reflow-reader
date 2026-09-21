import { createStore, del, get, set, values } from 'idb-keyval'
import type { ExtractedDocument } from '../pdf/types'
import type { LibraryEntry } from './types'

const libraryStore = createStore('reflow-reader-library', 'entries')
const contentStore = createStore('reflow-reader-content', 'documents')

export async function listLibrary(): Promise<LibraryEntry[]> {
  const entries = await values<LibraryEntry>(libraryStore)
  return entries.sort((a, b) => b.lastReadAt - a.lastReadAt)
}

export async function getEntry(id: string): Promise<LibraryEntry | undefined> {
  return get<LibraryEntry>(id, libraryStore)
}

export async function putEntry(entry: LibraryEntry): Promise<void> {
  await set(entry.id, entry, libraryStore)
}

export async function updateEntry(
  id: string,
  patch: Partial<Omit<LibraryEntry, 'id'>>,
): Promise<LibraryEntry | undefined> {
  const entry = await getEntry(id)
  if (!entry) return undefined
  const updated = { ...entry, ...patch }
  await putEntry(updated)
  return updated
}

export async function getContent(id: string): Promise<ExtractedDocument | undefined> {
  return get<ExtractedDocument>(id, contentStore)
}

export async function putContent(id: string, document: ExtractedDocument): Promise<void> {
  await set(id, document, contentStore)
}

export async function removeDocument(id: string): Promise<void> {
  await Promise.all([del(id, libraryStore), del(id, contentStore)])
}
