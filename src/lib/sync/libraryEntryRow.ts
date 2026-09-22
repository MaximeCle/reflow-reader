import type { LibraryEntry } from '../storage/types'

/** Wire shape of a `library_entries` row — see `supabase/schema.sql`. */
export interface LibraryEntryRow {
  code: string
  id: string
  title: string
  page_count: number
  added_at: number
  last_read_at: number
  progress: number
  bookmark: LibraryEntry['bookmark']
  reading_position: LibraryEntry['readingPosition']
}

export function toLibraryEntryRow(code: string, entry: LibraryEntry): LibraryEntryRow {
  return {
    code,
    id: entry.id,
    title: entry.title,
    page_count: entry.pageCount,
    added_at: entry.addedAt,
    last_read_at: entry.lastReadAt,
    progress: entry.progress,
    bookmark: entry.bookmark,
    reading_position: entry.readingPosition,
  }
}

export function fromLibraryEntryRow(row: LibraryEntryRow): LibraryEntry {
  return {
    id: row.id,
    title: row.title,
    pageCount: row.page_count,
    addedAt: row.added_at,
    lastReadAt: row.last_read_at,
    progress: row.progress,
    bookmark: row.bookmark,
    readingPosition: row.reading_position,
  }
}
