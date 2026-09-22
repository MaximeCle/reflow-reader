/**
 * The sync code is the whole access-control model: no email, no password.
 * Anyone who knows it can read and write that group's library, so it must be
 * hard to guess by hand rather than merely obscure.
 *
 * 16 characters from a 28-symbol alphabet (digits 2-9, consonants and Y, no
 * 0/O/1/I/L and no other vowel) is about 77 bits of entropy — far beyond
 * brute-forcing — while staying easy to read aloud and to type without typos.
 */
const ALPHABET = '23456789BCDFGHJKMNPQRSTVWXYZ'
const GROUP_SIZE = 4
const GROUP_COUNT = 4
const CODE_LENGTH = GROUP_SIZE * GROUP_COUNT

export function generateSyncCode(): string {
  const values = new Uint32Array(CODE_LENGTH)
  crypto.getRandomValues(values)
  const chars = Array.from(values, (value) => ALPHABET[value % ALPHABET.length])
  return formatSyncCode(chars.join(''))
}

/** Upper-cases and strips anything but the code's own alphabet, dashes included. */
export function normalizeSyncCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/gu, '')
}

export function isValidSyncCode(input: string): boolean {
  const normalized = normalizeSyncCode(input)
  if (normalized.length !== CODE_LENGTH) return false
  return [...normalized].every((char) => ALPHABET.includes(char))
}

/** Regroups a normalized code into `XXXX-XXXX-XXXX-XXXX` for display and typing. */
export function formatSyncCode(input: string): string {
  const normalized = normalizeSyncCode(input)
  const groups: string[] = []
  for (let i = 0; i < normalized.length; i += GROUP_SIZE) {
    groups.push(normalized.slice(i, i + GROUP_SIZE))
  }
  return groups.join('-')
}
