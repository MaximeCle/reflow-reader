import { useAtomValue, useSetAtom } from 'jotai'
import { BookOpen, FilePlus2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { libraryAtom, refreshLibraryAtom } from '../../atoms/library'
import type { LibraryEntry } from '../../lib/storage/types'
import { useLibraryActions } from './useLibraryActions'
import styles from './LibraryView.module.css'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })

function LibraryRow({
  entry,
  onOpen,
  onDelete,
}: {
  entry: LibraryEntry
  onOpen: () => void
  onDelete: () => void
}) {
  const percent = Math.round(entry.progress * 100)

  return (
    <li className={styles.row}>
      <button type="button" className={styles.rowMain} onClick={onOpen}>
        <BookOpen size={18} className={styles.rowIcon} aria-hidden="true" />
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{entry.title}</span>
          <span className={styles.rowMeta}>
            {percent} % lu · {entry.pageCount} pages · lu le {dateFormat.format(entry.lastReadAt)}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={styles.rowDelete}
        onClick={onDelete}
        aria-label={`Retirer « ${entry.title} » de la bibliothèque`}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
  )
}

export function LibraryView() {
  const entries = useAtomValue(libraryAtom)
  const refreshLibrary = useSetAtom(refreshLibraryAtom)
  const { importFile, openEntry, deleteEntry, importing, error } = useLibraryActions()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    void refreshLibrary()
  }, [refreshLibrary])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.appTitle}>reflow</h1>
        <p className={styles.tagline}>Vos PDF, remis en page pour être lus.</p>
      </header>

      <div
        className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files[0]
          if (file) void importFile(file)
        }}
      >
        <FilePlus2 size={22} aria-hidden="true" />
        <p className={styles.dropText}>Déposez un PDF ici</p>
        <button
          type="button"
          className={styles.pickButton}
          onClick={() => inputRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Lecture en cours…' : 'Choisir un fichier'}
        </button>
        <input
          ref={inputRef}
          className={styles.fileInput}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importFile(file)
            event.target.value = ''
          }}
        />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {entries.length > 0 && (
        <section className={styles.list}>
          <h2 className={styles.listTitle}>Bibliothèque</h2>
          <ul className={styles.rows}>
            {entries.map((entry) => (
              <LibraryRow
                key={entry.id}
                entry={entry}
                onOpen={() => void openEntry(entry)}
                onDelete={() => void deleteEntry(entry.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
