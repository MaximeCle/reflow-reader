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
})
