import { describe, expect, it } from 'vitest'
import {
  formatSyncCode,
  generateSyncCode,
  isValidSyncCode,
  normalizeSyncCode,
} from './syncCode'

describe('generateSyncCode', () => {
  it('produit un code groupé par quatre', () => {
    expect(generateSyncCode()).toMatch(/^[23456789BCDFGHJKMNPQRSTVWXYZ]{4}(-[23456789BCDFGHJKMNPQRSTVWXYZ]{4}){3}$/u)
  })

  it('exclut les caractères ambigus et les voyelles autres que Y', () => {
    const codes = Array.from({ length: 50 }, () => generateSyncCode())
    expect(codes.join('')).not.toMatch(/[01OIAEU]/u)
  })

  it('produit des codes différents à chaque appel', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateSyncCode()))
    expect(codes.size).toBe(20)
  })

  it('génère toujours un code valide', () => {
    expect(isValidSyncCode(generateSyncCode())).toBe(true)
  })
})

describe('normalizeSyncCode', () => {
  it('retire les tirets et les espaces, met en majuscules', () => {
    expect(normalizeSyncCode('a3f9-kq2r-88zp-mnbv')).toBe('A3F9KQ2R88ZPMNBV')
    expect(normalizeSyncCode(' A3F9 KQ2R 88ZP MNBV ')).toBe('A3F9KQ2R88ZPMNBV')
  })

  it('retire toute ponctuation collée par un copier-coller', () => {
    expect(normalizeSyncCode('A3F9–KQ2R–88ZP–MNBV.')).toBe('A3F9KQ2R88ZPMNBV')
  })
})

describe('isValidSyncCode', () => {
  it('accepte un code de la bonne longueur et du bon alphabet', () => {
    expect(isValidSyncCode('B3F9-KQ2R-88ZP-MNBV')).toBe(true)
    expect(isValidSyncCode('b3f9kq2r88zpmnbv')).toBe(true)
  })

  it('rejette une mauvaise longueur', () => {
    expect(isValidSyncCode('B3F9-KQ2R')).toBe(false)
    expect(isValidSyncCode('')).toBe(false)
  })

  it('rejette les caractères hors alphabet (voyelles, 0, O, 1, I, L)', () => {
    expect(isValidSyncCode('AAAA-KQ2R-88ZP-MNBV')).toBe(false)
    expect(isValidSyncCode('0000-KQ2R-88ZP-MNBV')).toBe(false)
    expect(isValidSyncCode('OOOO-KQ2R-88ZP-MNBV')).toBe(false)
    expect(isValidSyncCode('LLLL-KQ2R-88ZP-MNBV')).toBe(false)
  })
})

describe('formatSyncCode', () => {
  it('regroupe un code brut par quatre', () => {
    expect(formatSyncCode('A3F9KQ2R88ZPMNBV')).toBe('A3F9-KQ2R-88ZP-MNBV')
  })

  it('est idempotent sur un code déjà formaté', () => {
    expect(formatSyncCode('A3F9-KQ2R-88ZP-MNBV')).toBe('A3F9-KQ2R-88ZP-MNBV')
  })

  it('regroupe aussi une saisie partielle', () => {
    expect(formatSyncCode('a3f9kq')).toBe('A3F9-KQ')
  })
})
