/**
 * A deterministic, book-like color per document — the same visual language
 * as a shelf, where a title's cover never changes. Muted rather than bright:
 * these sit next to the accent color without competing with it or reading
 * as interactive.
 */
const SPINE_COLORS = [
  '#8C5A3D',
  '#3D6670',
  '#7A7050',
  '#5C6690',
  '#6B4E71',
  '#4F7355',
  '#8A4A56',
  '#3D6B8C',
]

function hashIndex(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % SPINE_COLORS.length
}

/** A single id's color in isolation. Two ids can land on the same one. */
export function spineColorFor(id: string): string {
  return SPINE_COLORS[hashIndex(id)] ?? SPINE_COLORS[0]!
}

/**
 * Colors for a whole library at once: each id starts from its own hash, but
 * a collision walks forward through the palette to the next free color —
 * so two books never share a spine while there are fewer books than colors.
 * Ids are sorted before assigning, so the result depends only on which
 * books are present, not on render or fetch order, keeping each book's
 * color stable as the library is read, re-sorted, or filtered.
 */
export function spineColorsFor(ids: string[]): Map<string, string> {
  const used = new Set<number>()
  const colors = new Map<string, string>()

  for (const id of [...new Set(ids)].sort()) {
    let index = hashIndex(id)
    while (used.has(index) && used.size < SPINE_COLORS.length) {
      index = (index + 1) % SPINE_COLORS.length
    }
    used.add(index)
    colors.set(id, SPINE_COLORS[index] ?? SPINE_COLORS[0]!)
  }

  return colors
}
