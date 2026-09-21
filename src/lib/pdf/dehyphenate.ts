const SOFT_HYPHEN = '­'

/**
 * Appends a wrapped line to the text accumulated so far.
 *
 * A trailing hyphen is dropped only when the next segment starts with a
 * lowercase letter: "inter-" + "face" is a broken word, while "chapitre-" +
 * "Titre" is more likely a real hyphen followed by a new sentence. A soft
 * hyphen is unambiguous — it only ever marks a line break — so it is always
 * dropped.
 */
export function joinTextSegments(accumulated: string, next: string): string {
  const left = accumulated.replace(/\s+$/u, '')
  const right = next.replace(/^\s+/u, '')

  if (left.length === 0) return right
  if (right.length === 0) return left

  if (left.endsWith(SOFT_HYPHEN)) {
    return left.slice(0, -1) + right
  }

  if (/[\p{L}\p{N}]-$/u.test(left)) {
    // A hyphen glued to a word never takes a space after it. It is a broken
    // word when the next line runs on in lowercase, a compound otherwise.
    return /^\p{Ll}/u.test(right) ? left.slice(0, -1) + right : left + right
  }

  return `${left} ${right}`
}
