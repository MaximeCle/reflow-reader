import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SyncSection } from './SyncSection'
import styles from './AddMenu.module.css'

interface AddMenuProps {
  onImport: (file: File) => void
  importing: boolean
  error: string | null
  onSynced: () => void
}

/**
 * A single discreet entry point for the two things that touch the outside
 * world: bringing a PDF in, and sharing the sync code. Tucked behind one
 * button instead of sitting permanently on the page.
 */
export function AddMenu({ onImport, importing, error, onSynced }: AddMenuProps) {
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Plus size={15} aria-hidden="true" />
        Ajouter
      </button>

      {open && (
        <div className={styles.panel}>
          <p className={styles.label}>Ajouter un PDF</p>
          <div
            className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ''} ${
              importing ? styles.dropZoneBusy : ''
            }`}
            role="button"
            tabIndex={importing ? -1 : 0}
            aria-disabled={importing}
            onClick={() => !importing && inputRef.current?.click()}
            onKeyDown={(event) => {
              if (importing) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              if (!importing) setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              const file = event.dataTransfer.files[0]
              if (file && !importing) onImport(file)
            }}
          >
            <span className={styles.dropLabel}>
              {importing ? 'Lecture en cours…' : 'Déposez un PDF'}
            </span>
            {!importing && <span className={styles.dropSub}>ou parcourir</span>}
            <input
              ref={inputRef}
              className={styles.fileInput}
              type="file"
              accept="application/pdf,.pdf"
              disabled={importing}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onImport(file)
                event.target.value = ''
              }}
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <div className={styles.divider} />

          <SyncSection onJoined={onSynced} />
        </div>
      )}
    </div>
  )
}
