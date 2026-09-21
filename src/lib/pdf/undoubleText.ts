/** Below this, a line is too short for doubling to be distinguishable from real text. */
const MIN_LINE_LENGTH = 6
/** A line must hold one token of at least three real characters ("aa bb" is not proof). */
const MIN_LONGEST_TOKEN = 6

function isDoubled(token: string): boolean {
  if (token.length < 2 || token.length % 2 !== 0) return false
  for (let i = 0; i < token.length; i += 2) {
    if (token[i] !== token[i + 1]) return false
  }
  return true
}

function halve(token: string): string {
  let halved = ''
  for (let i = 0; i < token.length; i += 2) halved += token[i]
  return halved
}

/**
 * Collapses a line whose every character was extracted twice — the text-level
 * counterpart of the overprint check in `groupItemsIntoLines`, for the files
 * where pdf.js merges the two passes into a single string:
 * "CCrriimmee eett cchhââttiimmeenntt" → "Crime et châtiment".
 *
 * Every token must be doubled for the line to be touched, so prose survives
 * untouched: one "MM." or "Hawaii" is enough to leave the line alone.
 *
 * Pairing is done on code points, never on normalized text: a decomposed accent
 * has its combining mark doubled too ("aa◌̂◌̂"), which pairs up correctly, while
 * composing first would break that pairing.
 */
export function undoubleText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length < MIN_LINE_LENGTH) return text

  const tokens = trimmed.split(/\s+/u)
  if (!tokens.every(isDoubled)) return text
  if (!tokens.some((token) => token.length >= MIN_LONGEST_TOKEN)) return text

  return tokens.map(halve).join(' ')
}
