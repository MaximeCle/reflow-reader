import { bodyFontSize } from './bodyFontSize'
import type { PositionedLine } from './types'

export interface DetectFootnotesOptions {
  /** Largest font size, relative to body text, that can be a note. */
  maxRatio?: number
  /** A note block never covers more than this share of a page's lines. */
  maxShare?: number
}

/** "1." "2)" "*" "†" followed by text — the usual way a note opens. */
const FOOTNOTE_MARKER = /^\s*(\d{1,3}\s*[.)°]?|[*†‡§¶])\s*\p{L}/u

export function startsFootnote(text: string): boolean {
  return FOOTNOTE_MARKER.test(text)
}

function groupByPage(lines: PositionedLine[]): Map<number, PositionedLine[]> {
  const byPage = new Map<number, PositionedLine[]>()
  for (const line of lines) {
    const pageLines = byPage.get(line.page)
    if (pageLines) pageLines.push(line)
    else byPage.set(line.page, [line])
  }
  return byPage
}

/**
 * Flags footnotes: the run of smaller lines that closes a page, under body text
 * set in the document's dominant size.
 *
 * Anchored to the bottom of the page and capped in size, so a page that is
 * simply set small throughout — a block quote, a page of endnotes — stays body
 * text rather than being greyed out wholesale. Lines must already be stripped
 * of running headers and page numbers.
 */
export function detectFootnotes(
  lines: PositionedLine[],
  options: DetectFootnotesOptions = {},
): PositionedLine[] {
  const maxRatio = options.maxRatio ?? 0.9
  const maxShare = options.maxShare ?? 0.6

  const body = bodyFontSize(lines)
  if (body === 0) return lines

  const threshold = body * maxRatio
  const footnotes = new Set<PositionedLine>()

  for (const pageLines of groupByPage(lines).values()) {
    let start = pageLines.length
    while (start > 0 && (pageLines[start - 1]?.fontSize ?? 0) <= threshold) start -= 1

    const runLength = pageLines.length - start
    // A note needs body text above it on the same page, and stays a minority of it.
    if (start === 0 || runLength === 0) continue
    if (runLength > pageLines.length * maxShare) continue

    for (const line of pageLines.slice(start)) footnotes.add(line)
  }

  if (footnotes.size === 0) return lines
  return lines.map((line) => (footnotes.has(line) ? { ...line, footnote: true } : line))
}
