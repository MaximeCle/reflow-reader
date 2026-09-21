import { useCallback, useEffect, useRef, useState } from 'react'
import type { Anchor } from '../../lib/storage/types'
import { anchorFromPoint, rectForAnchor } from './anchor'
import styles from './BookmarkLayer.module.css'

const LONG_PRESS_MS = 450
const MOVE_TOLERANCE_PX = 8

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
  const pressRef = useRef<{ timer: number; x: number; y: number } | null>(null)

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

  const placeAt = useCallback(
    (clientY: number) => {
      const content = contentRef.current
      if (!content) return
      // Probe just inside the text column: the pointer is out in the margin.
      const { left } = content.getBoundingClientRect()
      const anchor = anchorFromPoint(left + 2, clientY)
      if (anchor) onPlace(anchor)
    },
    [contentRef, onPlace],
  )

  const cancelPress = useCallback(() => {
    if (pressRef.current) {
      window.clearTimeout(pressRef.current.timer)
      pressRef.current = null
    }
  }, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') {
      if (event.button === 0) placeAt(event.clientY)
      return
    }

    const { clientX, clientY } = event
    const timer = window.setTimeout(() => {
      pressRef.current = null
      placeAt(clientY)
    }, LONG_PRESS_MS)
    pressRef.current = { timer, x: clientX, y: clientY }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const press = pressRef.current
    if (!press) return
    const moved =
      Math.abs(event.clientX - press.x) > MOVE_TOLERANCE_PX ||
      Math.abs(event.clientY - press.y) > MOVE_TOLERANCE_PX
    if (moved) cancelPress()
  }

  useEffect(() => cancelPress, [cancelPress])

  return (
    <>
      <div
        className={styles.hitArea}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
      />
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
