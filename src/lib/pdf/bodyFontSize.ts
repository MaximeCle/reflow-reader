/**
 * Body font size: the size most of the document's text is set in, weighted by
 * how much text each size carries. Headings and footnotes are measured against
 * it, so both must read it the same way.
 */
export function bodyFontSize(entries: ReadonlyArray<{ fontSize: number; text: string }>): number {
  const weights = new Map<number, number>()
  let best = 0
  let bestWeight = 0

  for (const entry of entries) {
    const size = Math.round(entry.fontSize * 2) / 2
    const weight = (weights.get(size) ?? 0) + entry.text.length
    weights.set(size, weight)
    if (weight > bestWeight) {
      bestWeight = weight
      best = size
    }
  }

  return best
}
