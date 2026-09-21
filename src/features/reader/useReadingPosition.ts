import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { findBlockElement, anchorFromPoint, rectAt } from '../bookmark/anchor'
import type { Block } from '../../lib/pdf/types'
import { updateEntry } from '../../lib/storage/documents'
import type { Anchor } from '../../lib/storage/types'

/** Where the "current line" is read from, below the top bar. */
export const PROBE_OFFSET_PX = 96
const SAVE_DEBOUNCE_MS = 800

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
  const pendingRef = useRef<{ anchor: Anchor; progress: number } | null>(null)
  const timerRef = useRef(0)
  const restoredRef = useRef(false)
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
    await updateEntry(entryId, {
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
      return
    }

    const block = findBlockElement(content, target.blockId)
    if (!block) return

    const rect = rectAt(block, target.charOffset) ?? block.getBoundingClientRect()
    window.scrollTo({ top: window.scrollY + rect.top - PROBE_OFFSET_PX, behavior: 'auto' })
    restoredRef.current = true
  }, [blocks.length, contentRef])

  useEffect(() => {
    if (entryId === '') return

    let frame = 0
    const onScroll = () => {
      if (frame !== 0 || !restoredRef.current) return
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
  }, [blocks.length, contentRef, entryId, flush, indexById])

  return { progress, flush }
}
