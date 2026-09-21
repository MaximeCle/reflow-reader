import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'
import { bookmarkAtom, closeDocumentAtom, readerAtom } from '../../atoms/reader'
import { settingsAtom } from '../../atoms/settings'
import { updateEntry } from '../../lib/storage/documents'
import type { Anchor } from '../../lib/storage/types'
import { BookmarkContextMenu } from '../bookmark/BookmarkContextMenu'
import { BookmarkLayer } from '../bookmark/BookmarkLayer'
import { anchorFromPoint } from '../bookmark/anchor'
import { DocumentFlow } from './DocumentFlow'
import { SettingsPanel } from './SettingsPanel'
import { TopBar } from './TopBar'
import { useAutoHideTopBar } from './useAutoHideTopBar'
import { PROBE_OFFSET_PX, useReadingPosition } from './useReadingPosition'
import styles from './ReaderView.module.css'

/** Above this, off-screen blocks are skipped by the browser. */
const VIRTUALIZE_ABOVE_PAGES = 200

export function ReaderView() {
  const state = useAtomValue(readerAtom)
  const setBookmark = useSetAtom(bookmarkAtom)
  const closeDocument = useSetAtom(closeDocumentAtom)
  const settings = useAtomValue(settingsAtom)
  const contentRef = useRef<HTMLElement | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; anchor: Anchor } | null>(
    null,
  )
  const topBarVisible = useAutoHideTopBar()

  const entryId = state?.entry.id ?? ''
  const blocks = state?.document.blocks ?? []
  const bookmark = state?.entry.bookmark ?? null

  // Reopening lands on the bookmark, or failing that on the last read position.
  const { progress, flush } = useReadingPosition({
    contentRef,
    blocks,
    entryId,
    restoreTo: state?.entry.bookmark ?? state?.entry.readingPosition ?? null,
  })

  const persistBookmark = useCallback(
    (anchor: Anchor | null) => {
      setBookmark(anchor)
      if (entryId) void updateEntry(entryId, { bookmark: anchor })
    },
    [entryId, setBookmark],
  )

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    const anchor = anchorFromPoint(event.clientX, event.clientY)
    if (!anchor) return // No line under the pointer: let the native menu show.
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, anchor })
  }, [])

  const toggleBookmarkAtReadingLine = useCallback(() => {
    if (bookmark) {
      persistBookmark(null)
      return
    }
    const content = contentRef.current
    if (!content) return
    const anchor = anchorFromPoint(content.getBoundingClientRect().left + 2, PROBE_OFFSET_PX)
    if (anchor) persistBookmark(anchor)
  }, [bookmark, persistBookmark])

  useEffect(() => {
    if (!settingsOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [settingsOpen])

  if (!state) return null

  const { document: extracted, entry, extracting, pagesProcessed } = state

  return (
    <div className={styles.reader} style={{ '--reading-font-size': `${settings.fontSize}px` } as React.CSSProperties}>
      <TopBar
        title={entry.title}
        progress={progress}
        visible={topBarVisible || settingsOpen}
        hasBookmark={bookmark !== null}
        onBack={() => {
          // Save first: the library reads the progress back as soon as it mounts.
          void flush().then(closeDocument)
        }}
        onToggleBookmark={toggleBookmarkAtReadingLine}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        settingsOpen={settingsOpen}
      />

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      <main className={styles.column}>
        <div className={styles.columnInner}>
          <BookmarkLayer
            contentRef={contentRef}
            bookmark={bookmark}
            onPlace={persistBookmark}
            onClear={() => persistBookmark(null)}
            layoutKey={`${settings.fontSize}:${extracted.blocks.length}`}
          />

          <article
            ref={contentRef}
            className={styles.content}
            lang="fr"
            onContextMenu={handleContextMenu}
          >
            <DocumentFlow
              blocks={extracted.blocks}
              virtualized={extracted.pageCount > VIRTUALIZE_ABOVE_PAGES}
            />
          </article>

          {extracting && (
            <p className={styles.extracting} role="status">
              Extraction en cours… page {pagesProcessed} sur {extracted.pageCount}
            </p>
          )}
        </div>
      </main>

      {contextMenu && (
        <BookmarkContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onConfirm={() => {
            persistBookmark(contextMenu.anchor)
            setContextMenu(null)
          }}
          onDismiss={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
