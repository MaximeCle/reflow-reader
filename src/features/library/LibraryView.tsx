import { useAtomValue, useSetAtom } from 'jotai'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { applyRemoteEntryAtom, libraryAtom, refreshLibraryAtom } from '../../atoms/library'
import { syncStateAtom } from '../../atoms/sync'
import { subscribeToLibraryChanges } from '../../lib/sync/syncClient'
import type { LibraryEntry } from '../../lib/storage/types'
import { AddMenu } from './AddMenu'
import { spineColorFor } from './spineColor'
import { useLibraryActions } from './useLibraryActions'
import styles from './LibraryView.module.css'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })

function Spine({ id, width, height }: { id: string; width: number; height: number }) {
  return (
    <div
      className={styles.spine}
      style={{ width, height, background: spineColorFor(id) }}
      aria-hidden="true"
    >
      <span className={styles.spineHighlight} />
    </div>
  )
}

function rowMeta(entry: LibraryEntry): string {
  const percent = Math.round(entry.progress * 100)
  if (percent >= 100) return `Terminé · ${entry.pageCount} pages`
  return `${entry.pageCount} pages · lu le ${dateFormat.format(entry.lastReadAt)}`
}

/** A rough, page-count-based estimate — there is no real per-book reading speed to draw on. */
function remainingLabel(entry: LibraryEntry): string {
  const pagesLeft = Math.max(0, entry.pageCount - entry.progress * entry.pageCount)
  const minutes = pagesLeft * 1.6
  if (minutes < 60) return `≈ ${Math.max(1, Math.round(minutes))} min restantes`
  return `≈ ${Math.round(minutes / 60)} h restantes`
}

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
          <Spine id={entry.id} width={30} height={44} />
          <input
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
        <Spine id={entry.id} width={30} height={44} />
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{entry.title}</span>
          <span className={styles.rowMeta}>{rowMeta(entry)}</span>
        </span>
      </button>

      <div className={styles.rowTrack} aria-hidden="true">
        <div className={styles.rowFill} style={{ width: `${Math.max(percent, 1)}%` }} />
      </div>
      <span className={styles.rowPercent}>{percent} %</span>

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
  const [query, setQuery] = useState('')

  useEffect(() => {
    void refreshLibrary()
  }, [refreshLibrary])

  // Live updates from other devices while this one stays on the library page.
  useEffect(() => {
    return subscribeToLibraryChanges((entry) => void applyRemoteEntry(entry))
  }, [applyRemoteEntry, syncState.code])

  // Most recently active book that isn't finished yet — already the first
  // match, since entries are sorted by lastReadAt.
  const current = entries.find((entry) => entry.progress < 1)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter((entry) => entry.title.toLowerCase().includes(needle))
  }, [entries, query])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <img className={styles.logo} src="/favicon.svg" alt="" width={22} height={22} />
          <span className={styles.wordmark}>PDF-reflow</span>
          <div className={styles.spacer} />
          <span className={styles.count}>
            {entries.length} {entries.length === 1 ? 'titre' : 'titres'}
          </span>
          <AddMenu
            onImport={(file) => void importFile(file)}
            importing={importing}
            error={error}
            onSynced={() => void refreshLibrary()}
          />
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.hero}>
          Lire un PDF
          <br />
          <em className={styles.heroEm}>comme un livre.</em>
        </h1>
        <p className={styles.subtitle}>
          Le texte est recomposé : colonne unique, marges justes, typographie de lecture. Vos
          fichiers restent sur votre appareil.
        </p>

        {current && (
          <button
            type="button"
            className={styles.resumeCard}
            onClick={() => void openEntry(current)}
            aria-label={`Continuer « ${current.title} »`}
          >
            <Spine id={current.id} width={56} height={82} />
            <span className={styles.resumeInfo}>
              <span className={styles.resumeEyebrow}>Reprendre</span>
              <span className={styles.resumeTitle}>{current.title}</span>
              <span className={styles.resumeMeta}>
                Reprise page {Math.max(1, Math.round(current.progress * current.pageCount))} ·{' '}
                {current.pageCount} pages
              </span>
              <span className={styles.resumeTrack}>
                <span
                  className={styles.resumeFill}
                  style={{ width: `${Math.max(current.progress * 100, 2)}%` }}
                />
              </span>
              <span className={styles.resumeFooter}>
                <span>{Math.round(current.progress * 100)} % lu</span>
                <span>{remainingLabel(current)}</span>
              </span>
            </span>
          </button>
        )}

        {entries.length > 0 && (
          <section className={styles.list}>
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>Bibliothèque</h2>
              <div className={styles.spacer} />
              <input
                className={styles.search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher"
                aria-label="Rechercher dans la bibliothèque"
              />
            </div>

            {filtered.length === 0 ? (
              <p className={styles.empty}>Aucun titre ne correspond.</p>
            ) : (
              <ul className={styles.rows}>
                {filtered.map((entry) => (
                  <LibraryRow
                    key={entry.id}
                    entry={entry}
                    onOpen={() => void openEntry(entry)}
                    onDelete={() => void deleteEntry(entry.id)}
                    onRename={(title) => void renameEntry(entry.id, title)}
                  />
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerText}>
            {syncState.code ? 'Bibliothèque synchronisée.' : 'Traitement local, aucun envoi.'}
          </span>
        </div>
      </footer>
    </div>
  )
}
