import { BookmarkPlus } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import styles from './BookmarkContextMenu.module.css'

interface BookmarkContextMenuProps {
  x: number
  y: number
  onConfirm: () => void
  onDismiss: () => void
}

const EDGE_MARGIN_PX = 8

/** A single-action context menu, positioned at the click and clamped to the viewport. */
export function BookmarkContextMenu({ x, y, onConfirm, onDismiss }: BookmarkContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const menu = ref.current
    if (!menu) return
    const { width, height } = menu.getBoundingClientRect()
    setPosition({
      left: Math.min(x, window.innerWidth - width - EDGE_MARGIN_PX),
      top: Math.min(y, window.innerHeight - height - EDGE_MARGIN_PX),
    })
  }, [x, y])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onDismiss()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    // Any scroll or resize invalidates the click position: close rather than drift.
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onDismiss, true)
    window.addEventListener('resize', onDismiss)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onDismiss, true)
      window.removeEventListener('resize', onDismiss)
    }
  }, [onDismiss])

  return (
    <div
      ref={ref}
      className={styles.menu}
      role="menu"
      style={{ left: `${position.left}px`, top: `${position.top}px` }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button type="button" role="menuitem" className={styles.item} onClick={onConfirm}>
        <BookmarkPlus size={15} aria-hidden="true" />
        Ajouter un marque-page
      </button>
    </div>
  )
}
