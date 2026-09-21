import type { RawParagraph } from './reconstructParagraphs'
import type { BlockKind } from './types'

export interface ClassifiedParagraph extends RawParagraph {
  kind: BlockKind
}

export interface DetectHeadingsOptions {
  /** Font size ratio above body text for an h2. */
  headingRatio?: number
  /** Font size ratio above body text for an h3. */
  subheadingRatio?: number
  /** A heading is short; longer blocks stay paragraphs whatever their size. */
  maxHeadingLength?: number
}

/** Body font size: the size most of the document's text is set in. */
function dominantFontSize(paragraphs: RawParagraph[]): number {
  const weights = new Map<number, number>()
  let best = 0
  let bestWeight = 0

  for (const paragraph of paragraphs) {
    const size = Math.round(paragraph.fontSize * 2) / 2
    const weight = (weights.get(size) ?? 0) + paragraph.text.length
    weights.set(size, weight)
    if (weight > bestWeight) {
      bestWeight = weight
      best = size
    }
  }

  return best
}

export function detectHeadings(
  paragraphs: RawParagraph[],
  options: DetectHeadingsOptions = {},
): ClassifiedParagraph[] {
  const headingRatio = options.headingRatio ?? 1.45
  const subheadingRatio = options.subheadingRatio ?? 1.15
  const maxHeadingLength = options.maxHeadingLength ?? 200

  const bodyFontSize = dominantFontSize(paragraphs)
  if (bodyFontSize === 0) {
    return paragraphs.map((paragraph) => ({ ...paragraph, kind: 'paragraph' }))
  }

  return paragraphs.map((paragraph) => {
    const ratio = paragraph.fontSize / bodyFontSize
    const short = paragraph.text.length <= maxHeadingLength

    let kind: BlockKind = 'paragraph'
    if (short && ratio >= headingRatio) kind = 'heading-2'
    else if (short && ratio >= subheadingRatio) kind = 'heading-3'

    return { ...paragraph, kind }
  })
}
