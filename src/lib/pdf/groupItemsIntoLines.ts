import type { PositionedLine, TextItemLite } from './types'

/** Horizontal gap, relative to font size, above which a space is inserted. */
const SPACE_GAP_FACTOR = 0.18
/** Horizontal drift, relative to the item's width, still counted as overprint. */
const OVERPRINT_X_FACTOR = 0.25
/** Vertical drift, relative to font size, still counted as overprint. */
const OVERPRINT_Y_FACTOR = 0.2

/**
 * True when an item redraws the previous one nearly in place — faux bold and
 * drop shadows paint the same glyphs twice, which reads as "CCrriimmee".
 *
 * A genuinely repeated glyph ("Hawaii") sits a full advance further right, well
 * beyond this tolerance, so real text is never collapsed.
 */
function isOverprint(item: TextItemLite, previous: TextItemLite): boolean {
  if (item.str !== previous.str || item.str.trim().length === 0) return false
  if (Math.abs(item.y - previous.y) > item.fontSize * OVERPRINT_Y_FACTOR) return false
  return Math.abs(item.x - previous.x) <= previous.width * OVERPRINT_X_FACTOR + 0.1
}

/**
 * Turns the text items of a single page into lines, relying on pdf.js'
 * `hasEOL` flag for line breaks and on horizontal gaps for missing spaces.
 */
export function groupItemsIntoLines(items: TextItemLite[], page: number): PositionedLine[] {
  const lines: PositionedLine[] = []

  let text = ''
  let x = 0
  let y = 0
  let fontSize = 0
  let rightEdge: number | null = null
  let started = false
  let previous: TextItemLite | null = null

  const flush = (): void => {
    const trimmed = text.trim()
    if (trimmed.length > 0) {
      lines.push({ page, text: trimmed, x, y, fontSize })
    }
    text = ''
    rightEdge = null
    started = false
    previous = null
  }

  for (const item of items) {
    if (item.str.length > 0 && !(previous !== null && isOverprint(item, previous))) {
      if (!started) {
        x = item.x
        y = item.y
        fontSize = item.fontSize
        started = true
      } else if (rightEdge !== null) {
        const gap = item.x - rightEdge
        const needsSpace =
          gap > item.fontSize * SPACE_GAP_FACTOR && !text.endsWith(' ') && !item.str.startsWith(' ')
        if (needsSpace) text += ' '
      }

      text += item.str
      rightEdge = item.x + item.width
      fontSize = Math.max(fontSize, item.fontSize)
      previous = item
    }

    if (item.hasEOL) flush()
  }

  flush()
  return lines
}
