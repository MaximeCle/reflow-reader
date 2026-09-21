import { describe, expect, it } from 'vitest'
import { buildDocument } from './buildDocument'
import type { PositionedLine } from './types'

const HEADER = 'Traité de la lecture'

/** A page: running header, body lines, page number. */
function page(pageNumber: number, body: Array<string | [string, number]>): PositionedLine[] {
  const rows: Array<[string, number]> = [
    [HEADER, 11],
    ...body.map((entry): [string, number] => (Array.isArray(entry) ? entry : [entry, 11])),
    [String(pageNumber), 9],
  ]

  return rows.map(([text, fontSize], index) => ({
    page: pageNumber,
    text,
    x: 72,
    y: 720 - index * 14,
    fontSize,
  }))
}

describe('buildDocument', () => {
  const lines = [
    ...page(1, [
      ['Chapitre premier', 20],
      'Le texte dun livre nest pas fait pour être regardé mais pour être lu, ce qui suppose une inter-',
      'face discrète et une colonne étroite, comme le rappelle',
    ]),
    ...page(2, ['la page suivante, où le paragraphe se poursuit avant de', 'se clore enfin.']),
    ...page(3, [
      ['Un sous-titre', 13],
      'Un dernier paragraphe vient fermer la démonstration de bout en bout.',
    ]),
    ...page(4, ['Une coda brève referme le volume sur une note discrète.']),
  ]

  const document = buildDocument(lines, 4)

  it('retient le nombre de pages', () => {
    expect(document.pageCount).toBe(4)
  })

  it('supprime len-tête courant et les numéros de page', () => {
    const text = document.blocks.map((block) => block.text).join(' ')
    expect(text).not.toContain(HEADER)
    expect(document.blocks.some((block) => /^\d+$/u.test(block.text))).toBe(false)
  })

  it('reconstruit les paragraphes, la césure et les titres', () => {
    expect(document.blocks.map(({ kind, text, page: origin }) => ({ kind, text, page: origin }))).toEqual([
      { kind: 'heading-2', text: 'Chapitre premier', page: 1 },
      {
        kind: 'paragraph',
        text: 'Le texte dun livre nest pas fait pour être regardé mais pour être lu, ce qui suppose une interface discrète et une colonne étroite, comme le rappelle la page suivante, où le paragraphe se poursuit avant de se clore enfin.',
        page: 1,
      },
      { kind: 'heading-3', text: 'Un sous-titre', page: 3 },
      {
        kind: 'paragraph',
        text: 'Un dernier paragraphe vient fermer la démonstration de bout en bout.',
        page: 3,
      },
      {
        kind: 'paragraph',
        text: 'Une coda brève referme le volume sur une note discrète.',
        page: 4,
      },
    ])
  })

  it('donne des identifiants de bloc stables et uniques', () => {
    const rebuilt = buildDocument(lines, 4)
    const ids = document.blocks.map((block) => block.id)

    expect(rebuilt.blocks.map((block) => block.id)).toEqual(ids)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('garde stables les identifiants des blocs déjà extraits quand des pages arrivent', () => {
    const partial = buildDocument(
      lines.filter((line) => line.page <= 3),
      4,
    )

    // The last block may still grow with the next page, earlier ones must not move.
    const settled = partial.blocks.slice(0, -1)
    expect(document.blocks.slice(0, settled.length)).toMatchObject(
      settled.map(({ id, text }) => ({ id, text })),
    )
  })

  it('isole les notes de bas de page sans les mêler au corps', () => {
    const withNotes = [
      ...page(1, [
        'Le vieux marin regardait la mer immobile, comme si le temps avait',
        'cessé de couler sur le pont du navire.',
        ['1. Voir à ce sujet lédition de 1866.', 8.5],
        ['2. Lauteur y revient au chapitre suivant.', 8.5],
      ]),
      ...page(2, ['Une deuxième page de corps, dans la taille dominante du document.']),
      ...page(3, ['Une troisième page de corps, toujours dans la même taille.']),
    ]

    const blocks = buildDocument(withNotes, 3).blocks

    expect(blocks.map(({ kind, text }) => ({ kind, text }))).toEqual([
      {
        kind: 'paragraph',
        text: 'Le vieux marin regardait la mer immobile, comme si le temps avait cessé de couler sur le pont du navire.',
      },
      { kind: 'footnote', text: '1. Voir à ce sujet lédition de 1866.' },
      { kind: 'footnote', text: '2. Lauteur y revient au chapitre suivant.' },
      {
        kind: 'paragraph',
        text: 'Une deuxième page de corps, dans la taille dominante du document.',
      },
      { kind: 'paragraph', text: 'Une troisième page de corps, toujours dans la même taille.' },
    ])
  })

  it('gère un document vide', () => {
    expect(buildDocument([], 0)).toEqual({ blocks: [], pageCount: 0 })
  })
})
