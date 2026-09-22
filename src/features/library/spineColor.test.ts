import { describe, expect, it } from 'vitest'
import { spineColorFor, spineColorsFor } from './spineColor'

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

describe('spineColorsFor', () => {
  it('évite les doublons tant quil y a assez de couleurs', () => {
    // 'doc-1', 'doc-9' et 'doc-10' se hashent sur la même couleur en
    // isolation — ensemble, il ny a que 3 livres pour 8 couleurs, donc
    // ils doivent tous en recevoir une différente.
    const colors = spineColorsFor(['doc-1', 'doc-9', 'doc-10'])
    const values = new Set(colors.values())
    expect(values.size).toBe(3)
  })

  it('reste stable pour un identifiant donné quel que soit lordre', () => {
    const a = spineColorsFor(['doc-1', 'doc-2', 'doc-3'])
    const b = spineColorsFor(['doc-3', 'doc-1', 'doc-2'])
    expect(a.get('doc-1')).toBe(b.get('doc-1'))
    expect(a.get('doc-2')).toBe(b.get('doc-2'))
    expect(a.get('doc-3')).toBe(b.get('doc-3'))
  })

  it('déduplique les identifiants répétés en entrée', () => {
    const colors = spineColorsFor(['doc-1', 'doc-1'])
    expect(colors.size).toBe(1)
  })
})
