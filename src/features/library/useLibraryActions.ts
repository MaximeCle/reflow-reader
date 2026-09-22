import { useSetAtom } from 'jotai'
import { useCallback, useState } from 'react'
import { refreshLibraryAtom } from '../../atoms/library'
import { readerAtom } from '../../atoms/reader'
import { hashBuffer } from '../../lib/hash'
import { getEntry } from '../../lib/storage/documents'
import type { LibraryEntry } from '../../lib/storage/types'
import { deleteSyncedDocument, ensureContentAvailable, saveContent, saveEntry, saveEntryUpdate } from '../../lib/sync/syncedStorage'

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function newEntry(id: string, title: string): LibraryEntry {
  const now = Date.now()
  return {
    id,
    title,
    pageCount: 0,
    addedAt: now,
    lastReadAt: now,
    progress: 0,
    bookmark: null,
    readingPosition: null,
  }
}

export function useLibraryActions() {
  const setReader = useSetAtom(readerAtom)
  const refreshLibrary = useSetAtom(refreshLibraryAtom)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openEntry = useCallback(
    async (entry: LibraryEntry) => {
      // Metadata may already be here from sync while the text itself is not yet.
      const content = await ensureContentAvailable(entry.id)
      if (!content) {
        setError('Le texte de ce document est introuvable. Importez à nouveau le PDF.')
        return
      }
      const updated = (await saveEntryUpdate(entry.id, { lastReadAt: Date.now() })) ?? entry
      setReader({
        entry: updated,
        document: content,
        pagesProcessed: content.pageCount,
        extracting: false,
      })
    },
    [setReader],
  )

  const importFile = useCallback(
    async (file: File) => {
      if (!isPdf(file)) {
        setError('Ce fichier n’est pas un PDF.')
        return
      }

      setError(null)
      setImporting(true)
      try {
        const buffer = await file.arrayBuffer()
        const id = await hashBuffer(buffer)

        // Already read once: reopen from storage instead of extracting again.
        const existing = await getEntry(id)
        if (existing) {
          const content = await ensureContentAvailable(id)
          if (content) {
            await openEntry(existing)
            return
          }
        }

        const fallbackTitle = file.name.replace(/\.pdf$/iu, '')
        const entry = existing ?? newEntry(id, fallbackTitle)

        // pdf.js and its worker are heavy: load them only on a real import.
        const { extractPdf } = await import('../../lib/pdf/extractPdf')

        // Show the opening pages while the rest is still being read.
        const extraction = extractPdf(buffer, fallbackTitle)
        let step = await extraction.next()
        while (!step.done) {
          const { document, pagesProcessed, totalPages } = step.value
          setReader({
            entry: { ...entry, pageCount: totalPages },
            document,
            pagesProcessed,
            extracting: true,
          })
          step = await extraction.next()
        }

        const { document, title } = step.value
        const finished: LibraryEntry = {
          ...entry,
          title: existing?.title ?? title,
          pageCount: document.pageCount,
          lastReadAt: Date.now(),
        }
        await Promise.all([saveContent(id, document), saveEntry(finished)])
        setReader({
          entry: finished,
          document,
          pagesProcessed: document.pageCount,
          extracting: false,
        })
        await refreshLibrary()
      } catch {
        setError('Impossible de lire ce PDF.')
        setReader(null)
      } finally {
        setImporting(false)
      }
    },
    [openEntry, refreshLibrary, setReader],
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      await deleteSyncedDocument(id)
      await refreshLibrary()
    },
    [refreshLibrary],
  )

  const renameEntry = useCallback(
    async (id: string, title: string) => {
      const trimmed = title.trim()
      if (trimmed.length === 0) return
      await saveEntryUpdate(id, { title: trimmed, lastReadAt: Date.now() })
      await refreshLibrary()
    },
    [refreshLibrary],
  )

  return { importFile, openEntry, deleteEntry, renameEntry, importing, error }
}
