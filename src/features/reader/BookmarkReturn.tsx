import { ArrowDown, ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { findBlockElement, rectAt } from '../bookmark/anchor'
import type { Anchor } from '../../lib/storage/types'
import { PROBE_OFFSET_PX } from './useReadingPosition'
import styles from './BookmarkReturn.module.css'

/** Keeps the pill from flashing when the line sits right at an edge. */
const EDGE_MARGIN_PX = 40

interface BookmarkReturnProps {
  contentRef: React.RefObject<HTMLElement | null>
  bookmark: Anchor | null
  onReturn: () => void
  /** Bumped by anything that reflows the text, to re-check the line. */
  layoutKey: unknown
}

/**
 * Offers the way back only while it is useful: the bookmarked line is out of
 * sight, and the arrow says which way it went.
 */
export function BookmarkReturn({
  contentRef,
  bookmark,
  onReturn,
  layoutKey,
}: BookmarkReturnProps) {
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    const content = contentRef.current
    if (!content || !bookmark) {
      setDirection(null)
      return
    }

    let frame = 0
    const check = () => {
      frame = 0
      const block = findBlockElement(content, bookmark.blockId)
      if (!block) {
        setDirection(null)
        return
      }
      // A skipped block reports a placeholder height, but which side of the
      // viewport it falls on — all this needs — still holds.
      const rect = rectAt(block, bookmark.charOffset) ?? block.getBoundingClientRect()
      const onScreen =
        rect.bottom > PROBE_OFFSET_PX && rect.top < window.innerHeight - EDGE_MARGIN_PX
      setDirection(onScreen ? null : rect.top < 0 ? 'up' : 'down')
    }

    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(check)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    check()

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [bookmark, contentRef, layoutKey])

  if (!direction) return null

  return (
    <button
      type="button"
      className={styles.pill}
      onClick={onReturn}
      aria-label="Revenir au marque-page"
    >
      {direction === 'up' ? (
        <ArrowUp size={15} aria-hidden="true" />
      ) : (
        <ArrowDown size={15} aria-hidden="true" />
      )}
      Marque-page
    </button>
  )
}
