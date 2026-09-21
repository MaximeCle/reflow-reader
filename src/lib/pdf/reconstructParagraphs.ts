import { joinTextSegments } from './dehyphenate'
import { startsFootnote } from './detectFootnotes'
import type { PositionedLine } from './types'

export interface RawParagraph {
  text: string
  /** Page the paragraph starts on. */
  page: number
  fontSize: number
  lineCount: number
  footnote: boolean
}

export interface ReconstructOptions {
  /** Vertical gap, as a multiple of the typical line gap, that breaks a paragraph. */
  paragraphGapFactor?: number
  /** Relative font size change that breaks a paragraph (heading vs body). */
  fontSizeTolerance?: number
  /** Extra indentation, relative to font size, that starts a new paragraph. */
  indentFactor?: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

function endsSentence(text: string): boolean {
  return /[.!?:;»”"')\]]$/u.test(text.trimEnd())
}

/**
 * Groups lines into paragraphs. Lines must be ordered by page, then top to
 * bottom (y descending, as in PDF user space).
 *
 * A paragraph ends on a vertical gap noticeably larger than the document's
 * typical line gap, on a font size change, or on a first-line indent. Across a
 * page break, the flow continues only when the text clearly runs on.
 */
export function reconstructParagraphs(
  lines: PositionedLine[],
  options: ReconstructOptions = {},
): RawParagraph[] {
  const gapFactor = options.paragraphGapFactor ?? 1.35
  const fontSizeTolerance = options.fontSizeTolerance ?? 0.12
  const indentFactor = options.indentFactor ?? 0.6

  if (lines.length === 0) return []

  const gaps: number[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const prev = lines[i - 1]
    const current = lines[i]
    if (!prev || !current || prev.page !== current.page) continue
    const gap = prev.y - current.y
    if (gap > 0) gaps.push(gap)
  }
  const typicalGap = median(gaps) || (lines[0]?.fontSize ?? 12) * 1.2

  // Body text left margin: most lines start there, indented lines start further right.
  const bodyLeft = median(lines.map((line) => line.x))

  const paragraphs: RawParagraph[] = []
  let text = ''
  let page = 0
  let fontSize = 0
  let maxFontSize = 0
  let lineCount = 0
  let footnote = false
  let previous: PositionedLine | null = null

  const flush = (): void => {
    const trimmed = text.trim()
    if (trimmed.length > 0) {
      paragraphs.push({ text: trimmed, page, fontSize: maxFontSize, lineCount, footnote })
    }
    text = ''
    lineCount = 0
  }

  const start = (line: PositionedLine): void => {
    text = line.text
    page = line.page
    fontSize = line.fontSize
    maxFontSize = line.fontSize
    lineCount = 1
    footnote = line.footnote === true
  }

  for (const line of lines) {
    if (previous === null) {
      start(line)
      previous = line
      continue
    }

    const sameFontSize =
      fontSize > 0 && Math.abs(line.fontSize - fontSize) / fontSize <= fontSizeTolerance
    // Body text and a note never share a block, even at close font sizes.
    const sameKind = (line.footnote === true) === footnote
    // Notes are numbered: a marker opens the next one rather than continuing this one.
    const opensAnotherNote = footnote && startsFootnote(line.text)

    let breaksParagraph: boolean
    if (line.page === previous.page) {
      const gap = previous.y - line.y
      const isIndented = line.x - bodyLeft > line.fontSize * indentFactor
      breaksParagraph =
        gap > typicalGap * gapFactor ||
        !sameFontSize ||
        !sameKind ||
        isIndented ||
        opensAnotherNote
    } else {
      const continuesFlow =
        sameFontSize &&
        sameKind &&
        !opensAnotherNote &&
        !endsSentence(text) &&
        /^\p{Ll}/u.test(line.text.trimStart())
      breaksParagraph = !continuesFlow
    }

    if (breaksParagraph) {
      flush()
      start(line)
    } else {
      text = joinTextSegments(text, line.text)
      maxFontSize = Math.max(maxFontSize, line.fontSize)
      lineCount += 1
    }

    previous = line
  }

  flush()
  return paragraphs
}
