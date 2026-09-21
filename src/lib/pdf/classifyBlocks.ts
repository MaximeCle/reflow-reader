import { bodyFontSize } from './bodyFontSize'
import type { RawParagraph } from './reconstructParagraphs'
import type { BlockKind } from './types'

export interface ClassifiedParagraph extends RawParagraph {
  kind: BlockKind
}

export interface ClassifyOptions {
  /** Font size ratio above body text for an h2. */
  headingRatio?: number
  /** Font size ratio above body text for an h3. */
  subheadingRatio?: number
  /** A heading is short; longer blocks stay paragraphs whatever their size. */
  maxHeadingLength?: number
}

/** Gives every block its kind: note, heading, subheading, or plain paragraph. */
export function classifyBlocks(
  paragraphs: RawParagraph[],
  options: ClassifyOptions = {},
): ClassifiedParagraph[] {
  const headingRatio = options.headingRatio ?? 1.45
  const subheadingRatio = options.subheadingRatio ?? 1.15
  const maxHeadingLength = options.maxHeadingLength ?? 200

  // Notes are set small by definition: they must not skew the body size.
  const body = bodyFontSize(paragraphs.filter((paragraph) => !paragraph.footnote))

  return paragraphs.map((paragraph) => {
    if (paragraph.footnote) return { ...paragraph, kind: 'footnote' }
    if (body === 0) return { ...paragraph, kind: 'paragraph' }

    const ratio = paragraph.fontSize / body
    const short = paragraph.text.length <= maxHeadingLength

    let kind: BlockKind = 'paragraph'
    if (short && ratio >= headingRatio) kind = 'heading-2'
    else if (short && ratio >= subheadingRatio) kind = 'heading-3'

    return { ...paragraph, kind }
  })
}
