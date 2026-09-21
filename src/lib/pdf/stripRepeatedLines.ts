import type { PositionedLine } from './types'

export interface StripRepeatedLinesOptions {
  /** How many lines at the top and bottom of a page can be a header/footer. */
  edgeLines?: number
  /** Below this page count, repetition is not evidence of a header. */
  minPages?: number
  /** Share of pages a line must appear on to count as repeated. */
  minRatio?: number
  /** Headers and footers are short; longer lines are body text. */
  maxLength?: number
}

/** Digits are blanked so "Page 3" and "Page 4" compare equal. */
function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\d+/gu, '#')
}

function groupByPage(lines: PositionedLine[]): Map<number, PositionedLine[]> {
  const byPage = new Map<number, PositionedLine[]>()
  for (const line of lines) {
    const pageLines = byPage.get(line.page)
    if (pageLines) pageLines.push(line)
    else byPage.set(line.page, [line])
  }
  return byPage
}

/**
 * Drops running headers, footers and page numbers: lines that recur, modulo
 * their digits, at the top or bottom of most pages.
 */
export function stripRepeatedLines(
  lines: PositionedLine[],
  options: StripRepeatedLinesOptions = {},
): PositionedLine[] {
  const edgeLines = options.edgeLines ?? 2
  const minPages = options.minPages ?? 3
  const minRatio = options.minRatio ?? 0.6
  const maxLength = options.maxLength ?? 80

  const byPage = groupByPage(lines)
  const pages = [...byPage.keys()]
  if (pages.length < minPages) return lines

  const topCounts = new Map<string, number>()
  const bottomCounts = new Map<string, number>()

  const isCandidate = (text: string): boolean => {
    const key = normalize(text)
    return key.length > 0 && key.length <= maxLength
  }

  const count = (counts: Map<string, number>, pageLines: PositionedLine[]): void => {
    // Count once per page so a line repeated within one page is not mistaken
    // for a running header.
    const seen = new Set<string>()
    for (const line of pageLines) {
      if (!isCandidate(line.text)) continue
      const key = normalize(line.text)
      if (seen.has(key)) continue
      seen.add(key)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  for (const pageLines of byPage.values()) {
    count(topCounts, pageLines.slice(0, edgeLines))
    count(bottomCounts, pageLines.slice(-edgeLines))
  }

  const threshold = Math.max(2, Math.ceil(pages.length * minRatio))
  const isRepeated = (counts: Map<string, number>, key: string): boolean =>
    (counts.get(key) ?? 0) >= threshold

  const kept: PositionedLine[] = []
  for (const pageLines of byPage.values()) {
    const bottomStart = Math.max(0, pageLines.length - edgeLines)
    pageLines.forEach((line, index) => {
      if (!isCandidate(line.text)) {
        kept.push(line)
        return
      }
      const key = normalize(line.text)
      if (index < edgeLines && isRepeated(topCounts, key)) return
      if (index >= bottomStart && isRepeated(bottomCounts, key)) return
      kept.push(line)
    })
  }

  return kept
}
