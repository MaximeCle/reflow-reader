import { describe, expect, it } from 'vitest'
import { spineColorFor } from './spineColor'

describe('spineColorFor', () => {
  it('est déterministe pour un même identifiant', () => {
    expect(spineColorFor('doc-1')).toBe(spineColorFor('doc-1'))
  })

  it('renvoie une couleur hexadécimale valide', () => {
    expect(spineColorFor('un-identifiant-quelconque')).toMatch(/^#[0-9a-f]{6}$/iu)
  })

  it('varie selon lidentifiant', () => {
    const colors = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(spineColorFor))
    expect(colors.size).toBeGreaterThan(1)
  })

  it('gère une chaîne vide', () => {
    expect(spineColorFor('')).toMatch(/^#[0-9a-f]{6}$/iu)
  })
})
