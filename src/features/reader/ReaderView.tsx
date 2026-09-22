import { useAtomValue, useSetAtom } from 'jotai'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { bookmarkAtom, closeDocumentAtom, readerAtom } from '../../atoms/reader'
import { settingsAtom } from '../../atoms/settings'
import type { Anchor } from '../../lib/storage/types'
import { saveEntryUpdate } from '../../lib/sync/syncedStorage'
import { BookmarkContextMenu } from '../bookmark/BookmarkContextMenu'
import { BookmarkLayer } from '../bookmark/BookmarkLayer'
import { anchorFromPoint } from '../bookmark/anchor'
import { BookmarkReturn } from './BookmarkReturn'
import { ChaptersPanel } from './ChaptersPanel'
import { DocumentFlow } from './DocumentFlow'
import { SettingsPanel } from './SettingsPanel'
import { TopBar } from './TopBar'
import { scrollToAnchor, useReadingPosition } from './useReadingPosition'
import styles from './ReaderView.module.css'

/** Above this, off-screen blocks are skipped by the browser. */
const VIRTUALIZE_ABOVE_PAGES = 200
/** Below this, restoring is fast enough that a spinner would only flicker. */
const LOADER_DELAY_MS = 200

export function ReaderView() {
  const state = useAtomValue(readerAtom)
  const setBookmark = useSetAtom(bookmarkAtom)
  const closeDocument = useSetAtom(closeDocumentAtom)
  const settings = useAtomValue(settingsAtom)
  const contentRef = useRef<HTMLElement | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chaptersOpen, setChaptersOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; anchor: Anchor } | null>(
    null,
  )

  const entryId = state?.entry.id ?? ''
  const blocks = useMemo(() => state?.document.blocks ?? [], [state])
  const bookmark = state?.entry.bookmark ?? null
  // The biggest heading tier stands in for chapter titles: no separate
  // structure to maintain, and it already draws each one apart in the text.
  const chapters = useMemo(() => blocks.filter((block) => block.kind === 'heading-2'), [blocks])

  // Reopening lands on the bookmark, or failing that on the last read position.
  const { progress, flush, restoring } = useReadingPosition({
    contentRef,
    blocks,
    entryId,
    restoreTo: state?.entry.bookmark ?? state?.entry.readingPosition ?? null,
  })

  const persistBookmark = useCallback(
    (anchor: Anchor | null) => {
      setBookmark(anchor)
      if (entryId) void saveEntryUpdate(entryId, { bookmark: anchor, lastReadAt: Date.now() })
    },
    [entryId, setBookmark],
  )

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    const anchor = anchorFromPoint(event.clientX, event.clientY)
    if (!anchor) return // No line under the pointer: let the native menu show.
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, anchor })
  }, [])

  const goToBookmark = useCallback(() => {
    const content = contentRef.current
    if (content && bookmark) scrollToAnchor(content, bookmark)
  }, [bookmark])

  const goToChapter = useCallback((blockId: string) => {
    const content = contentRef.current
    if (content) scrollToAnchor(content, { blockId, charOffset: 0 })
    setChaptersOpen(false)
  }, [])

  /*
   * The text stays hidden while its position is being restored, so a long
   * document that takes a moment otherwise looks like the app has frozen.
   * The spinner only appears once that wait has run past a short delay —
   * the common case restores within a couple of frames and must never see it.
   */
  const [showLoader, setShowLoader] = useState(false)
  useEffect(() => {
    if (!restoring) return undefined
    const timer = window.setTimeout(() => setShowLoader(true), LOADER_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      setShowLoader(false)
    }
  }, [restoring])

  if (!state) return null

  const { document: extracted, entry, extracting, pagesProcessed } = state

  return (
    <div className={styles.reader} style={
        {
          '--reading-font-size': `${settings.fontSize}px`,
          '--reading-line-height': String(settings.lineHeight),
        } as React.CSSProperties
      }>
      <TopBar
        title={entry.title}
        progress={progress}
        onBack={() => {
          // Save first: the library reads the progress back as soon as it mounts.
          void flush().then(closeDocument)
        }}
        hasChapters={chapters.length > 0}
        chaptersOpen={chaptersOpen}
        onToggleChapters={() => setChaptersOpen((open) => !open)}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        settingsOpen={settingsOpen}
      />

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {chaptersOpen && (
        <ChaptersPanel
          chapters={chapters}
          onSelect={goToChapter}
          onClose={() => setChaptersOpen(false)}
        />
      )}

      {showLoader && (
        <div className={styles.restoringIndicator} role="status" aria-live="polite">
          <Loader2 size={22} className={styles.restoringSpinner} aria-hidden="true" />
          <span className="sr-only">Reprise de la lecture…</span>
        </div>
      )}

      <main className={styles.column}>
        <div className={styles.columnInner}>
          <BookmarkLayer
            contentRef={contentRef}
            bookmark={bookmark}
            onPlace={persistBookmark}
            onClear={() => persistBookmark(null)}
            layoutKey={`${settings.fontSize}:${settings.lineHeight}:${settings.font}:${extracted.blocks.length}`}
          />

          <article
            ref={contentRef}
            className={`${styles.content} ${restoring ? styles.restoring : ''}`}
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

      <BookmarkReturn
        contentRef={contentRef}
        bookmark={bookmark}
        onReturn={goToBookmark}
        layoutKey={`${settings.fontSize}:${settings.lineHeight}:${settings.font}:${extracted.blocks.length}`}
      />

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
