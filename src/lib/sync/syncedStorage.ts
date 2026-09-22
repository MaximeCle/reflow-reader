import type { ExtractedDocument } from '../pdf/types'
import { getContent, putContent, putEntry, removeDocument, updateEntry } from '../storage/documents'
import type { LibraryEntry } from '../storage/types'
import { mergeLibraryEntry } from './mergeLibraryEntry'
import {
  isSyncEnabled,
  listSyncedContentIds,
  pullContent,
  pullEntries,
  pushContent,
  pushDelete,
  pushEntry,
} from './syncClient'

/**
 * Thin wrappers around `lib/storage/documents` that also push to sync when
 * it's on. The local write always happens first and is never blocked by the
 * network: IndexedDB stays the source of truth for this device regardless of
 * connectivity.
 */

export async function saveEntry(entry: LibraryEntry): Promise<void> {
  await putEntry(entry)
  void pushEntry(entry)
}

export async function saveEntryUpdate(
  id: string,
  patch: Partial<Omit<LibraryEntry, 'id'>>,
): Promise<LibraryEntry | undefined> {
  const updated = await updateEntry(id, patch)
  if (updated) void pushEntry(updated)
  return updated
}

export async function saveContent(id: string, document: ExtractedDocument): Promise<void> {
  await putContent(id, document)
  void pushContent(id, document)
}

export async function deleteSyncedDocument(id: string): Promise<void> {
  await removeDocument(id)
  void pushDelete(id)
}

/**
 * Pulls the group's entries (if sync is on) and reconciles them with the
 * local library: per document, the newer of the two copies wins and is
 * written back to IndexedDB. Never throws — a failed pull just leaves the
 * local library as the answer, so this is safe to call on every mount.
 */
export async function reconcileLibraryWithSync(local: LibraryEntry[]): Promise<LibraryEntry[]> {
  if (!isSyncEnabled()) return local

  let remoteEntries: LibraryEntry[]
  try {
    remoteEntries = await pullEntries()
  } catch {
    return local
  }

  const remaining = new Map(local.map((entry) => [entry.id, entry]))
  const merged: LibraryEntry[] = []

  for (const remote of remoteEntries) {
    const result = mergeLibraryEntry(remaining.get(remote.id), remote)
    merged.push(result)
    remaining.delete(remote.id)
    await putEntry(result)
  }

  // Entries this device has that the group has never seen: push them up.
  for (const localOnly of remaining.values()) {
    merged.push(localOnly)
    void pushEntry(localOnly)
  }

  void backfillMissingContent(merged)

  return merged
}

/**
 * Uploads the text of any book this device holds and the group does not.
 * Entries and content travel separately, and content is only pushed when a
 * PDF is imported — so books imported before sync was set up would sync
 * their covers and progress while staying impossible to open elsewhere.
 */
async function backfillMissingContent(entries: LibraryEntry[]): Promise<void> {
  const alreadySynced = await listSyncedContentIds()

  for (const entry of entries) {
    if (alreadySynced.has(entry.id)) continue
    const content = await getContent(entry.id)
    if (content) await pushContent(entry.id, content)
  }
}

/**
 * Content is immutable once extracted, so it is pulled at most once: if it
 * is already on this device, or sync cannot supply it, nothing happens.
 */
export async function ensureContentAvailable(id: string): Promise<ExtractedDocument | undefined> {
  const local = await getContent(id)
  if (local) return local
  if (!isSyncEnabled()) return undefined
  try {
    const remote = await pullContent(id)
    if (remote) await putContent(id, remote)
    return remote
  } catch {
    return undefined
  }
}
