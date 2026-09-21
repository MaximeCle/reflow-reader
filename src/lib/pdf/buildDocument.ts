import { classifyBlocks } from './classifyBlocks'
import { detectFootnotes } from './detectFootnotes'
import { reconstructParagraphs } from './reconstructParagraphs'
import { stripRepeatedLines } from './stripRepeatedLines'
import { undoubleText } from './undoubleText'
import type { Block, ExtractedDocument, PositionedLine } from './types'

/**
 * Full reconstruction: repair overprinted lines, strip running headers and
 * footers, rebuild paragraphs, classify headings, then hand out stable block
 * ids.
 *
 * Ids are derived from the block's position in the flow, so re-extracting the
 * same PDF yields the same ids — bookmarks stay anchored.
 */
export function buildDocument(lines: PositionedLine[], pageCount: number): ExtractedDocument {
  const repaired = lines.map((line) => ({ ...line, text: undoubleText(line.text) }))
  // Footnotes are found after headers and page numbers are gone: they too sit
  // at the bottom of the page and would otherwise be taken for notes.
  const cleaned = detectFootnotes(stripRepeatedLines(repaired))
  const classified = classifyBlocks(reconstructParagraphs(cleaned))

  const blocks: Block[] = classified.map((paragraph, index) => ({
    id: `b${index}p${paragraph.page}`,
    kind: paragraph.kind,
    text: paragraph.text,
    page: paragraph.page,
  }))

  return { blocks, pageCount }
}
