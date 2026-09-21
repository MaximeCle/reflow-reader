/**
 * A bookmark never stores pixels or a visual line number: the reflow changes
 * with width and font size. It stores the paragraph and the character offset of
 * the first character of the bookmarked line.
 */
export interface Anchor {
  blockId: string
  charOffset: number
}

export interface LibraryEntry {
  /** SHA-256 of the PDF. */
  id: string
  title: string
  pageCount: number
  addedAt: number
  lastReadAt: number
  /** 0 to 1, from the auto-saved reading position. */
  progress: number
  bookmark: Anchor | null
  readingPosition: Anchor | null
}
