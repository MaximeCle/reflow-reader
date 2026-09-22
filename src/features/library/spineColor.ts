/**
 * A deterministic, book-like color per document — the same visual language
 * as a shelf, where a title's cover never changes. Muted rather than bright:
 * these sit next to the accent color without competing with it or reading
 * as interactive.
 */
const SPINE_COLORS = ['#8C5A3D', '#3D6670', '#7A7050', '#5C6690']

export function spineColorFor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % SPINE_COLORS.length
  return SPINE_COLORS[index] ?? SPINE_COLORS[0]!
}
