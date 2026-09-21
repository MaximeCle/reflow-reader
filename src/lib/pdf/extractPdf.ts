import * as pdfjs from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { buildDocument } from './buildDocument'
import { groupItemsIntoLines } from './groupItemsIntoLines'
import type { ExtractedDocument, PositionedLine, TextItemLite } from './types'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const EAGER_PAGES = 3
const BATCH_PAGES = 10

export interface ExtractionProgress {
  document: ExtractedDocument
  pagesProcessed: number
  totalPages: number
}

export interface PdfMetadata {
  title: string
  pageCount: number
}

function toTextItemLite(item: TextItem): TextItemLite {
  const [, , scaleX, scaleY, x, y] = item.transform as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  return {
    str: item.str,
    x,
    y,
    width: item.width,
    height: item.height,
    fontSize: Math.hypot(scaleX, scaleY) || item.height,
    fontName: item.fontName,
    hasEOL: item.hasEOL,
  }
}

function isTextItem(item: unknown): item is TextItem {
  return typeof item === 'object' && item !== null && 'str' in item
}

async function readMetadataTitle(pdf: pdfjs.PDFDocumentProxy, fallback: string): Promise<string> {
  try {
    const metadata = await pdf.getMetadata()
    const info = metadata.info as { Title?: unknown } | undefined
    const title = typeof info?.Title === 'string' ? info.Title.trim() : ''
    return title.length > 0 ? title : fallback
  } catch {
    // Older engines can fail to parse the metadata stream: the file name will do.
    return fallback
  }
}

/**
 * Extracts a PDF page by page, yielding the document rebuilt from everything
 * read so far so the reader can show the opening pages while the rest lands.
 */
export async function* extractPdf(
  data: ArrayBuffer,
  fallbackTitle: string,
): AsyncGenerator<ExtractionProgress, { document: ExtractedDocument; title: string }> {
  // pdf.js transfers the buffer it is given to its worker, detaching it, so it
  // gets a copy and the caller keeps its own.
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) })
  const pdf = await loadingTask.promise
  const totalPages = pdf.numPages
  const title = await readMetadataTitle(pdf, fallbackTitle)
  const lines: PositionedLine[] = []

  try {
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const items = content.items.filter(isTextItem).map(toTextItemLite)
      lines.push(...groupItemsIntoLines(items, pageNumber))
      page.cleanup()

      // Rebuilding the flow is cheap but not free: refresh eagerly for the
      // first pages, then in batches.
      const isLast = pageNumber === totalPages
      if (pageNumber <= EAGER_PAGES || pageNumber % BATCH_PAGES === 0 || isLast) {
        yield {
          document: buildDocument(lines, totalPages),
          pagesProcessed: pageNumber,
          totalPages,
        }
      }
    }

    return { document: buildDocument(lines, totalPages), title }
  } finally {
    await loadingTask.destroy()
  }
}
