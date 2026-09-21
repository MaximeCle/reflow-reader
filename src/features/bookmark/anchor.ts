import type { Anchor } from '../../lib/storage/types'

export const BLOCK_ID_ATTRIBUTE = 'data-block-id'

interface CaretPosition {
  node: Node
  offset: number
}

/** `caretRangeFromPoint` is the WebKit spelling of `caretPositionFromPoint`. */
interface CaretDocument {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  caretRangeFromPoint?: (x: number, y: number) => Range | null
}

function caretPositionFromPoint(x: number, y: number): CaretPosition | null {
  const doc = document as unknown as CaretDocument

  if (typeof doc.caretPositionFromPoint === 'function') {
    const position = doc.caretPositionFromPoint(x, y)
    return position ? { node: position.offsetNode, offset: position.offset } : null
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y)
    return range ? { node: range.startContainer, offset: range.startOffset } : null
  }
  return null
}

function closestBlock(node: Node | null): HTMLElement | null {
  const element = node instanceof Element ? node : (node?.parentElement ?? null)
  return element?.closest<HTMLElement>(`[${BLOCK_ID_ATTRIBUTE}]`) ?? null
}

export function findBlockElement(container: ParentNode, blockId: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    `[${BLOCK_ID_ATTRIBUTE}="${CSS.escape(blockId)}"]`,
  )
}

/** Character offset of a DOM position, counted from the start of the block. */
export function offsetWithinBlock(block: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange()
  range.selectNodeContents(block)
  range.setEnd(node, offset)
  return range.toString().length
}

/** The DOM position of a character offset, walking the block's text nodes. */
export function domPositionAt(block: HTMLElement, charOffset: number): CaretPosition | null {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let remaining = Math.max(0, charOffset)
  let lastText: Text | null = null

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node as Text
    if (remaining <= text.data.length) return { node: text, offset: remaining }
    remaining -= text.data.length
    lastText = text
  }

  return lastText ? { node: lastText, offset: lastText.data.length } : null
}

/** A one-character range, so the rect has a real height even on an empty line. */
export function rangeAt(block: HTMLElement, charOffset: number): Range | null {
  const start = domPositionAt(block, charOffset)
  if (!start) return null

  const range = document.createRange()
  range.setStart(start.node, start.offset)

  const end = domPositionAt(block, charOffset + 1)
  if (end && (end.node !== start.node || end.offset > start.offset)) {
    range.setEnd(end.node, end.offset)
  } else {
    range.setEnd(start.node, start.offset)
  }
  return range
}

export function rectAt(block: HTMLElement, charOffset: number): DOMRect | null {
  const range = rangeAt(block, charOffset)
  if (!range) return null
  const rects = range.getClientRects()
  return rects.length > 0 ? (rects[0] ?? range.getBoundingClientRect()) : range.getBoundingClientRect()
}

/**
 * Walks back to the first character sharing the clicked character's line box.
 * The anchor must name the start of a line, not wherever the pointer landed.
 */
export function snapToLineStart(block: HTMLElement, charOffset: number): number {
  const target = rectAt(block, charOffset)
  if (!target) return 0

  let offset = Math.max(0, charOffset)
  while (offset > 0) {
    const previous = rectAt(block, offset - 1)
    if (!previous || Math.abs(previous.top - target.top) > 1) break
    offset -= 1
  }
  return offset
}

/**
 * Resolves a point to `{ blockId, charOffset }`. Pass an x inside the text
 * column: a click in the margin still anchors to the line next to it.
 */
export function anchorFromPoint(x: number, y: number): Anchor | null {
  const position = caretPositionFromPoint(x, y)
  if (!position) return null

  const block = closestBlock(position.node)
  const blockId = block?.getAttribute(BLOCK_ID_ATTRIBUTE)
  if (!block || !blockId) return null

  const charOffset = offsetWithinBlock(block, position.node, position.offset)
  return { blockId, charOffset: snapToLineStart(block, charOffset) }
}

/** Where the anchored line currently sits, recomputed from the live layout. */
export function rectForAnchor(container: ParentNode, anchor: Anchor): DOMRect | null {
  const block = findBlockElement(container, anchor.blockId)
  return block ? rectAt(block, anchor.charOffset) : null
}
