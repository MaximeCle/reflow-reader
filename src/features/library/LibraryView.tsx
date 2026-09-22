import { useAtomValue, useSetAtom } from 'jotai'
import { BookOpen, Check, FilePlus2, Pencil, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { applyRemoteEntryAtom, libraryAtom, refreshLibraryAtom } from '../../atoms/library'
import { syncStateAtom } from '../../atoms/sync'
import { subscribeToLibraryChanges } from '../../lib/sync/syncClient'
import type { LibraryEntry } from '../../lib/storage/types'
import { SyncPanel } from './SyncPanel'
import { useLibraryActions } from './useLibraryActions'
import styles from './LibraryView.module.css'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })

function LibraryRow({
  entry,
  onOpen,
  onDelete,
  onRename,
}: {
  entry: LibraryEntry
  onOpen: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const percent = Math.round(entry.progress * 100)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(entry.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEditing = () => {
    setDraft(entry.title)
    setEditing(true)
  }

  const commit = () => {
    onRename(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className={styles.row}>
        <form
          className={styles.rowEditForm}
          onSubmit={(event) => {
            event.preventDefault()
            commit()
          }}
        >
          <BookOpen size={18} className={styles.rowIcon} aria-hidden="true" />
          <input
            ref={inputRef}
            className={styles.rowEditInput}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setEditing(false)
            }}
            aria-label="Titre du document"
            autoFocus
          />
          <button type="submit" className={styles.rowIconButton} aria-label="Valider le titre">
            <Check size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.rowIconButton}
            onClick={() => setEditing(false)}
            aria-label="Annuler"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </form>
      </li>
    )
  }

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
        className={styles.rowIconButton}
        onClick={startEditing}
        aria-label={`Renommer « ${entry.title} »`}
      >
        <Pencil size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.rowIconButton}
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
  const applyRemoteEntry = useSetAtom(applyRemoteEntryAtom)
  const syncState = useAtomValue(syncStateAtom)
  const { importFile, openEntry, deleteEntry, renameEntry, importing, error } = useLibraryActions()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    void refreshLibrary()
  }, [refreshLibrary])

  // Live updates from other devices while this one stays on the library page.
  useEffect(() => {
    return subscribeToLibraryChanges((entry) => void applyRemoteEntry(entry))
  }, [applyRemoteEntry, syncState.code])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.appTitle}>PDF-reflow</h1>
        <p className={styles.tagline}>Lire un PDF comme un livre.</p>
        <SyncPanel onJoined={() => void refreshLibrary()} />
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
                onRename={(title) => void renameEntry(entry.id, title)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
