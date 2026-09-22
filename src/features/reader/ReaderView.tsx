import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useRef, useState } from 'react'
import { bookmarkAtom, closeDocumentAtom, readerAtom } from '../../atoms/reader'
import { settingsAtom } from '../../atoms/settings'
import type { Anchor } from '../../lib/storage/types'
import { saveEntryUpdate } from '../../lib/sync/syncedStorage'
import { BookmarkContextMenu } from '../bookmark/BookmarkContextMenu'
import { BookmarkLayer } from '../bookmark/BookmarkLayer'
import { anchorFromPoint } from '../bookmark/anchor'
import { BookmarkReturn } from './BookmarkReturn'
import { DocumentFlow } from './DocumentFlow'
import { SettingsPanel } from './SettingsPanel'
import { TopBar } from './TopBar'
import { PROBE_OFFSET_PX, scrollToAnchor, useReadingPosition } from './useReadingPosition'
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

  const entryId = state?.entry.id ?? ''
  const blocks = state?.document.blocks ?? []
  const bookmark = state?.entry.bookmark ?? null

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

  /*
   * Places the bookmark on the line being read, or moves it here. Long-pressing
   * the 20px margin is unusable on a phone, and going back to the bookmark is
   * the pill's job — so the button is free to be the one-tap way to set it.
   * Pressing it again on the same line takes it away.
   */
  const bookmarkAction = useCallback(() => {
    const content = contentRef.current
    if (!content) return
    const anchor = anchorFromPoint(content.getBoundingClientRect().left + 2, PROBE_OFFSET_PX)
    if (!anchor) return

    const onSameLine =
      bookmark?.blockId === anchor.blockId && bookmark?.charOffset === anchor.charOffset
    persistBookmark(onSameLine ? null : anchor)
  }, [bookmark, persistBookmark])

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
        hasBookmark={bookmark !== null}
        onBack={() => {
          // Save first: the library reads the progress back as soon as it mounts.
          void flush().then(closeDocument)
        }}
        onBookmarkAction={bookmarkAction}
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
