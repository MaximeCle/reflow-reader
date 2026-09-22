import type { LibraryEntry } from '../storage/types'

/**
 * Reconciles a local and a remote copy of the same document's entry.
 *
 * Every local write to a library entry stamps `lastReadAt`, so it doubles as
 * a logical clock: the newer stamp wins outright, keeping bookmark, reading
 * position and progress together rather than merging them field by field —
 * a device that hasn't caught up yet must not overwrite a device that has.
 */
export function mergeLibraryEntry(local: LibraryEntry | undefined, remote: LibraryEntry): LibraryEntry {
  if (!local) return remote
  return remote.lastReadAt >= local.lastReadAt ? remote : local
}
