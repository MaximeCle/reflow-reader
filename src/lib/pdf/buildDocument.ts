import { detectHeadings } from './detectHeadings'
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
  const cleaned = stripRepeatedLines(repaired)
  const classified = detectHeadings(reconstructParagraphs(cleaned))

  const blocks: Block[] = classified.map((paragraph, index) => ({
    id: `b${index}p${paragraph.page}`,
    kind: paragraph.kind,
    text: paragraph.text,
    page: paragraph.page,
  }))

  return { blocks, pageCount }
}
