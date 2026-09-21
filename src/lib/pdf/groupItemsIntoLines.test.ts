import { describe, expect, it } from 'vitest'
import { groupItemsIntoLines } from './groupItemsIntoLines'
import type { TextItemLite } from './types'

function item(str: string, x: number, y: number, overrides: Partial<TextItemLite> = {}): TextItemLite {
  return {
    str,
    x,
    y,
    width: str.length * 5,
    height: 11,
    fontSize: 11,
    fontName: 'g_d0_f1',
    hasEOL: false,
    ...overrides,
  }
}

describe('groupItemsIntoLines', () => {
  it('assemble les fragments dune même ligne jusquau saut de ligne', () => {
    const items = [
      item('Le vieux', 72, 700),
      item(' marin', 112, 700),
      item('regardait la mer.', 145, 700, { hasEOL: true }),
      item('Une autre ligne.', 72, 686, { hasEOL: true }),
    ]

    expect(groupItemsIntoLines(items, 3).map((line) => line.text)).toEqual([
      'Le vieux marin regardait la mer.',
      'Une autre ligne.',
    ])
  })

  it('insère une espace quand deux fragments sont écartés', () => {
    const items = [item('mot', 72, 700), item('suivant', 100, 700, { hasEOL: true })]

    expect(groupItemsIntoLines(items, 1)[0]?.text).toBe('mot suivant')
  })

  it('ne coupe pas un mot dont les fragments se touchent', () => {
    const items = [item('inter', 72, 700), item('face', 97, 700, { hasEOL: true })]

    expect(groupItemsIntoLines(items, 1)[0]?.text).toBe('interface')
  })

  it('retient la position et la plus grande taille de police de la ligne', () => {
    const items = [
      item('Titre', 80, 700, { fontSize: 18 }),
      item(' suite', 130, 700, { fontSize: 11, hasEOL: true }),
    ]

    const [line] = groupItemsIntoLines(items, 2)

    expect(line).toMatchObject({ page: 2, x: 80, y: 700, fontSize: 18 })
  })

  it('ignore les lignes vides', () => {
    const items = [item('', 72, 700, { hasEOL: true }), item('Texte.', 72, 686, { hasEOL: true })]

    expect(groupItemsIntoLines(items, 1)).toHaveLength(1)
  })

  it('clôt la dernière ligne sans marqueur de fin', () => {
    expect(groupItemsIntoLines([item('Sans EOL final.', 72, 700)], 1)).toHaveLength(1)
  })

  it('supprime un glyphe repeint en place (faux gras)', () => {
    // Chaque glyphe est dessiné deux fois, décalé de 0,3 pt : « CCrriimmee ».
    const glyphs = [...'Crime'].flatMap((char, index) => {
      const x = 72 + index * 5.5
      return [item(char, x, 700), item(char, x + 0.3, 700)]
    })
    glyphs[glyphs.length - 1] = { ...glyphs[glyphs.length - 1]!, hasEOL: true }

    expect(groupItemsIntoLines(glyphs, 1)[0]?.text).toBe('Crime')
  })

  it('supprime une ligne entière repeinte en place', () => {
    const items = [
      item('Crime et châtiment', 72, 700),
      item('Crime et châtiment', 72.4, 700, { hasEOL: true }),
    ]

    expect(groupItemsIntoLines(items, 1)[0]?.text).toBe('Crime et châtiment')
  })

  it('garde une lettre réellement répétée', () => {
    // Le second « i » de « Hawaii » est une avance complète plus loin.
    const items = [
      item('Hawa', 72, 700),
      item('i', 92, 700),
      item('i', 94.8, 700, { hasEOL: true }),
    ]

    expect(groupItemsIntoLines(items, 1)[0]?.text).toBe('Hawaii')
  })

  it('garde un mot répété ailleurs sur la ligne', () => {
    const items = [
      item('tout', 72, 700),
      item('tout', 140, 700, { hasEOL: true }),
    ]

    expect(groupItemsIntoLines(items, 1)[0]?.text).toBe('tout tout')
  })

  it('garde un texte identique sur une autre ligne', () => {
    const items = [
      item('Chapitre', 72, 700, { hasEOL: true }),
      item('Chapitre', 72, 686, { hasEOL: true }),
    ]

    expect(groupItemsIntoLines(items, 1)).toHaveLength(2)
  })
})
