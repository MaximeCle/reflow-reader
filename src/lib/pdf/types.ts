/**
 * Minimal shape of a pdf.js text item, decoupled from pdfjs-dist so the
 * reconstruction pipeline stays pure and testable without a real PDF.
 */
export interface TextItemLite {
  str: string
  /** Left edge, PDF user space (origin bottom-left). */
  x: number
  /** Baseline, PDF user space: larger y means higher on the page. */
  y: number
  width: number
  height: number
  fontSize: number
  fontName: string
  hasEOL: boolean
}

export interface PositionedLine {
  page: number
  text: string
  x: number
  y: number
  fontSize: number
  /** Set by `detectFootnotes` for the note block closing a page. */
  footnote?: boolean
}

export type BlockKind = 'paragraph' | 'heading-2' | 'heading-3' | 'footnote'

export interface Block {
  /** Stable across re-extraction of the same document. */
  id: string
  kind: BlockKind
  text: string
  /** Page the block starts on. */
  page: number
}

export interface ExtractedDocument {
  blocks: Block[]
  pageCount: number
}
