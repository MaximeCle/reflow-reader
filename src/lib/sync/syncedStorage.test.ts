import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibraryEntry } from '../storage/types'

const sync = vi.hoisted(() => ({
  isSyncEnabled: vi.fn(),
  listSyncedContentIds: vi.fn(),
  pullContent: vi.fn(),
  pullEntries: vi.fn(),
  pushContent: vi.fn(),
  pushDelete: vi.fn(),
  pushEntry: vi.fn(),
}))

const storage = vi.hoisted(() => ({
  getContent: vi.fn(),
  putContent: vi.fn(),
  putEntry: vi.fn(),
  removeDocument: vi.fn(),
  updateEntry: vi.fn(),
}))

vi.mock('./syncClient', () => sync)
vi.mock('../storage/documents', () => storage)

function entry(id: string, lastReadAt = 1000): LibraryEntry {
  return {
    id,
    title: id,
    pageCount: 10,
    addedAt: 0,
    lastReadAt,
    progress: 0,
    bookmark: null,
    readingPosition: null,
  }
}

const document = { blocks: [{ id: 'b1', kind: 'paragraph' as const, text: 'x', page: 1 }], pageCount: 10 }

beforeEach(() => {
  vi.clearAllMocks()
  sync.isSyncEnabled.mockReturnValue(true)
  sync.pullEntries.mockResolvedValue([])
  sync.listSyncedContentIds.mockResolvedValue(new Set<string>())
  sync.pushContent.mockResolvedValue(undefined)
  storage.putEntry.mockResolvedValue(undefined)
  storage.getContent.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.resetModules()
})

describe('reconcileLibraryWithSync', () => {
  /*
   * Fiches et texte voyagent séparément, et le texte n'est poussé qu'à
   * l'import : sans ce rattrapage, un livre importé avant la mise en place de
   * la synchro apparaît sur l'autre appareil sans pouvoir s'y ouvrir.
   */
  it('envoie le texte des livres que le groupe n’a pas encore', async () => {
    storage.getContent.mockResolvedValue(document)
    const { reconcileLibraryWithSync } = await import('./syncedStorage')

    await reconcileLibraryWithSync([entry('livre-1')])
    await vi.waitFor(() => expect(sync.pushContent).toHaveBeenCalledWith('livre-1', document))
  })

  it('rattrape aussi un livre dont seule la fiche avait été synchronisée', async () => {
    // Déjà connu du groupe côté fiches, mais absent de document_content.
    sync.pullEntries.mockResolvedValue([entry('livre-1', 2000)])
    storage.getContent.mockResolvedValue(document)
    const { reconcileLibraryWithSync } = await import('./syncedStorage')

    await reconcileLibraryWithSync([entry('livre-1')])
    await vi.waitFor(() => expect(sync.pushContent).toHaveBeenCalledWith('livre-1', document))
  })

  it('ne renvoie pas un texte que le groupe possède déjà', async () => {
    sync.listSyncedContentIds.mockResolvedValue(new Set(['livre-1']))
    storage.getContent.mockResolvedValue(document)
    const { reconcileLibraryWithSync } = await import('./syncedStorage')

    await reconcileLibraryWithSync([entry('livre-1')])
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(sync.pushContent).not.toHaveBeenCalled()
  })

  it('ignore les livres dont ce téléphone n’a pas le texte', async () => {
    sync.pullEntries.mockResolvedValue([entry('livre-distant')])
    const { reconcileLibraryWithSync } = await import('./syncedStorage')

    await reconcileLibraryWithSync([])
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(sync.pushContent).not.toHaveBeenCalled()
  })
})
