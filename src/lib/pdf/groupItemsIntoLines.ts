import type { PositionedLine, TextItemLite } from './types'

/** Horizontal gap, relative to font size, above which a space is inserted. */
const SPACE_GAP_FACTOR = 0.18

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

  const flush = (): void => {
    const trimmed = text.trim()
    if (trimmed.length > 0) {
      lines.push({ page, text: trimmed, x, y, fontSize })
    }
    text = ''
    rightEdge = null
    started = false
  }

  for (const item of items) {
    if (item.str.length > 0) {
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
    }

    if (item.hasEOL) flush()
  }

  flush()
  return lines
}
