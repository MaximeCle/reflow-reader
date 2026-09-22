import { useCallback, useEffect, useState } from 'react'
import type { Anchor } from '../../lib/storage/types'
import { anchorFromPoint, rectForAnchor } from './anchor'
import styles from './BookmarkLayer.module.css'

interface BookmarkLayerProps {
  /** The element holding the blocks; anchors resolve against it. */
  contentRef: React.RefObject<HTMLElement | null>
  bookmark: Anchor | null
  onPlace: (anchor: Anchor) => void
  onClear: () => void
  /** Bumped by anything that reflows the text, to re-measure the marker. */
  layoutKey: unknown
}

export function BookmarkLayer({
  contentRef,
  bookmark,
  onPlace,
  onClear,
  layoutKey,
}: BookmarkLayerProps) {
  const [markerTop, setMarkerTop] = useState<number | null>(null)

  /** The visual position is never stored: it is recomputed from the anchor. */
  const measure = useCallback(() => {
    const content = contentRef.current
    if (!content || !bookmark) {
      setMarkerTop(null)
      return
    }
    const rect = rectForAnchor(content, bookmark)
    if (!rect) {
      setMarkerTop(null)
      return
    }
    setMarkerTop(rect.top - content.getBoundingClientRect().top)
  }, [bookmark, contentRef])

  useEffect(() => {
    measure()
  }, [measure, layoutKey])

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const observer = new ResizeObserver(() => measure())
    observer.observe(content)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [contentRef, measure])

  /*
   * A click place it — and on touch, "click" already means a tap that didn't
   * turn into a scroll: the browser only synthesizes it when the finger
   * didn't move beyond its own small threshold, `touch-action: pan-y` lets a
   * drag scroll through instead. No custom long-press or gesture logic
   * needed to tell the two apart, and mouse and touch end up on one path.
   */
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const content = contentRef.current
      if (!content) return
      // Probe just inside the text column: the pointer is out in the margin.
      const { left } = content.getBoundingClientRect()
      const anchor = anchorFromPoint(left + 2, event.clientY)
      if (anchor) onPlace(anchor)
    },
    [contentRef, onPlace],
  )

  return (
    <>
      <div className={styles.hitArea} onClick={handleClick} />
      {markerTop !== null && (
        <button
          type="button"
          className={styles.marker}
          style={{ top: `${markerTop}px` }}
          onClick={onClear}
          data-bookmark-marker=""
          title="Marque-page — cliquer pour le retirer"
          aria-label="Marque-page — cliquer pour le retirer"
        />
      )}
    </>
  )
}
