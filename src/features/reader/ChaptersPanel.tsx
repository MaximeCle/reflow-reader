import { useEffect, useRef } from 'react'
import type { Block } from '../../lib/pdf/types'
import styles from './ChaptersPanel.module.css'

interface ChaptersPanelProps {
  chapters: Block[]
  onSelect: (blockId: string) => void
  onClose: () => void
}

export function ChaptersPanel({ chapters, onSelect, onClose }: ChaptersPanelProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      // The toggle button closes the panel itself; closing here too would
      // reopen it on the click that follows.
      if (ref.current?.contains(target ?? null) || target?.closest('[data-chapters-toggle]')) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div ref={ref} className={styles.panel} role="dialog" aria-label="Chapitres">
      <ul className={styles.list}>
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <button type="button" className={styles.item} onClick={() => onSelect(chapter.id)}>
              <span className={styles.itemTitle}>{chapter.text}</span>
              <span className={styles.itemPage}>{chapter.page}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
