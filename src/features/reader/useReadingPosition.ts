import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { findBlockElement, anchorFromPoint, rectAt } from '../bookmark/anchor'
import type { Block } from '../../lib/pdf/types'
import type { Anchor } from '../../lib/storage/types'
import { saveEntryUpdate } from '../../lib/sync/syncedStorage'

/** Where the "current line" is read from, below the top bar. */
export const PROBE_OFFSET_PX = 96
const SAVE_DEBOUNCE_MS = 800
/**
 * How long to keep holding a restored line in place. The reading webfont is
 * fetched with `display: swap`, so the whole column reflows well after the
 * first paint — a single scroll on mount lands far off on a long document.
 */
const SETTLE_MS = 3000
/** Closer than this and the line is in place; chasing it would only jitter. */
const TOLERANCE_PX = 1

/** How far the anchored line sits from where it belongs, null if not in the DOM. */
function anchorOffset(content: HTMLElement, anchor: Anchor): number | null {
  const block = findBlockElement(content, anchor.blockId)
  if (!block) return null
  const rect = rectAt(block, anchor.charOffset) ?? block.getBoundingClientRect()
  return rect.top - PROBE_OFFSET_PX
}

/**
 * Measures with virtualization off: a skipped block reports a placeholder
 * height, so a line deep in a long document otherwise resolves thousands of
 * pixels short of where it really sits.
 */
function measure(content: HTMLElement, anchor: Anchor, force: boolean): number | null {
  if (!force) return anchorOffset(content, anchor)
  content.dataset.forceLayout = 'true'
  try {
    return anchorOffset(content, anchor)
  } finally {
    delete content.dataset.forceLayout
  }
}

/**
 * Puts an anchored line just under the top bar. Returns false when the block
 * is not in the DOM yet, so the caller can retry as extraction adds more.
 *
 * The first pass measures with virtualization forced off to land in the right
 * neighbourhood; the passes after it measure the resting layout, which is what
 * the reader actually ends up looking at.
 */
export function scrollToAnchor(content: HTMLElement, anchor: Anchor, force = true): boolean {
  for (let pass = 0; pass < 3; pass += 1) {
    const offset = measure(content, anchor, force && pass === 0)
    if (offset === null) return false
    if (Math.abs(offset) <= TOLERANCE_PX) break
    window.scrollTo({ top: window.scrollY + offset, behavior: 'auto' })
  }
  return true
}

interface Options {
  contentRef: React.RefObject<HTMLElement | null>
  blocks: Block[]
  entryId: string
  /** Scrolled to once, when the document opens. */
  restoreTo: Anchor | null
}

interface ReadingPosition {
  /** 0 to 1. */
  progress: number
  /** Resolves once the position is on disk, so the library can read it back. */
  flush: () => Promise<void>
}

/**
 * Tracks the topmost visible line as a `{ blockId, charOffset }` anchor and
 * saves it, so reopening lands on the same sentence whatever the reflow.
 */
export function useReadingPosition({
  contentRef,
  blocks,
  entryId,
  restoreTo,
}: Options): ReadingPosition {
  const [progress, setProgress] = useState(0)
  // Drives the tracking effect: recording where someone is reading only makes
  // sense once the page has stopped moving under them.
  const [settled, setSettled] = useState(false)
  const pendingRef = useRef<{ anchor: Anchor; progress: number } | null>(null)
  const timerRef = useRef(0)
  const restoredRef = useRef(false)
  const settledRef = useRef(false)
  // Captured once: placing a bookmark later must not scroll the reader.
  const restoreToRef = useRef(restoreTo)

  const indexById = useMemo(() => {
    const map = new Map<string, number>()
    blocks.forEach((block, index) => map.set(block.id, index))
    return map
  }, [blocks])

  const flush = useCallback(async () => {
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    await saveEntryUpdate(entryId, {
      readingPosition: pending.anchor,
      progress: pending.progress,
      lastReadAt: Date.now(),
    })
  }, [entryId])

  // Restore before tracking, and retry while progressive extraction adds blocks.
  useLayoutEffect(() => {
    if (restoredRef.current) return

    const target = restoreToRef.current
    const content = contentRef.current
    if (!target || !content) {
      restoredRef.current = true
      settledRef.current = true
      setSettled(true)
      return
    }

    if (scrollToAnchor(content, target)) restoredRef.current = true
  }, [blocks.length, contentRef])

  /*
   * The column keeps moving after that first scroll — the webfont swaps in and
   * reflows every paragraph, extraction appends blocks — so hold the line in
   * place until it stops moving, the window runs out, or the reader takes over.
   */
  useEffect(() => {
    if (settledRef.current) return

    const target = restoreToRef.current
    const content = contentRef.current
    if (!target || !content) {
      settledRef.current = true
      setSettled(true)
      return
    }

    let frame = 0
    const deadline = performance.now() + SETTLE_MS
    const controller = new AbortController()

    const settle = () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      frame = 0
      controller.abort()
      settledRef.current = true
      // Found or not, restoring is over: a later jump would yank the page
      // out from under someone who has started reading.
      restoredRef.current = true
      setSettled(true)
    }

    const tick = () => {
      if (performance.now() > deadline) {
        settle()
        return
      }
      if (restoredRef.current) {
        const offset = anchorOffset(content, target)
        if (offset !== null && Math.abs(offset) > TOLERANCE_PX) {
          window.scrollTo({ top: window.scrollY + offset, behavior: 'auto' })
        }
      }
      frame = window.requestAnimationFrame(tick)
    }

    // Anything deliberate hands the page back: never fight a reader.
    const { signal } = controller
    for (const event of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) {
      window.addEventListener(event, settle, { signal, passive: true })
    }
    frame = window.requestAnimationFrame(tick)

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      controller.abort()
    }
  }, [blocks.length, contentRef])

  useEffect(() => {
    if (entryId === '' || !settled) return

    let frame = 0
    const onScroll = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const content = contentRef.current
        if (!content) return

        const anchor = anchorFromPoint(content.getBoundingClientRect().left + 2, PROBE_OFFSET_PX)
        if (!anchor) return

        const index = indexById.get(anchor.blockId) ?? 0
        const ratio = blocks.length > 1 ? index / (blocks.length - 1) : 0
        setProgress(ratio)
        pendingRef.current = { anchor, progress: ratio }

        window.clearTimeout(timerRef.current)
        timerRef.current = window.setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
      })
    }

    const onPageHide = () => void flush()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onPageHide)
    onScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onPageHide)
      if (frame !== 0) window.cancelAnimationFrame(frame)
      window.clearTimeout(timerRef.current)
      void flush()
    }
  }, [blocks.length, contentRef, entryId, flush, indexById, settled])

  return { progress, flush }
}
