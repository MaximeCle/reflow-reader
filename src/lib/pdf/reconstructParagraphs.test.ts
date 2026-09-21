import { describe, expect, it } from 'vitest'
import { reconstructParagraphs } from './reconstructParagraphs'
import type { PositionedLine } from './types'

const LINE_HEIGHT = 14
const BODY_SIZE = 11
const MARGIN = 72

interface LineOverrides {
  x?: number
  fontSize?: number
}

/** Builds a page of evenly spaced lines, top to bottom. */
function page(
  pageNumber: number,
  entries: Array<string | [string, LineOverrides]>,
  options: { startY?: number; gaps?: number[] } = {},
): PositionedLine[] {
  const startY = options.startY ?? 700
  let y = startY

  return entries.map((entry, index) => {
    const [text, overrides] = Array.isArray(entry) ? entry : [entry, {}]
    if (index > 0) y -= options.gaps?.[index - 1] ?? LINE_HEIGHT
    return {
      page: pageNumber,
      text,
      x: overrides.x ?? MARGIN,
      y,
      fontSize: overrides.fontSize ?? BODY_SIZE,
    }
  })
}

describe('reconstructParagraphs', () => {
  it('assemble les lignes régulières en un seul paragraphe', () => {
    const lines = page(1, [
      'Le vieux marin regardait la mer,',
      'immobile, comme si le temps avait',
      'cessé de couler sur le pont.',
    ])

    const paragraphs = reconstructParagraphs(lines)

    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0]?.text).toBe(
      'Le vieux marin regardait la mer, immobile, comme si le temps avait cessé de couler sur le pont.',
    )
    expect(paragraphs[0]?.page).toBe(1)
    expect(paragraphs[0]?.lineCount).toBe(3)
  })

  it('coupe sur un écart vertical plus grand', () => {
    const lines = page(
      1,
      ['Première ligne du premier bloc.', 'Deuxième ligne du premier bloc.', 'Un second bloc.'],
      { gaps: [LINE_HEIGHT, LINE_HEIGHT * 2.2] },
    )

    const paragraphs = reconstructParagraphs(lines)

    expect(paragraphs.map((p) => p.text)).toEqual([
      'Première ligne du premier bloc. Deuxième ligne du premier bloc.',
      'Un second bloc.',
    ])
  })

  it('recolle les mots coupés en fin de ligne', () => {
    const lines = page(1, ['Le texte est affiché dans une inter-', 'face pensée pour la lecture.'])

    const paragraphs = reconstructParagraphs(lines)

    expect(paragraphs[0]?.text).toBe('Le texte est affiché dans une interface pensée pour la lecture.')
  })

  it('coupe sur un changement de taille de police', () => {
    const lines = page(1, [
      ['Chapitre premier', { fontSize: 18 }],
      'Le vent soufflait sur la lande déserte.',
      'On entendait au loin le bruit des vagues.',
    ])

    const paragraphs = reconstructParagraphs(lines)

    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]?.text).toBe('Chapitre premier')
    expect(paragraphs[0]?.fontSize).toBe(18)
    expect(paragraphs[1]?.text).toBe(
      'Le vent soufflait sur la lande déserte. On entendait au loin le bruit des vagues.',
    )
  })

  it('coupe sur une indentation de première ligne', () => {
    const lines = page(1, [
      'La première phrase occupe deux lignes',
      'et se termine ici.',
      ['Un nouveau paragraphe indenté commence.', { x: MARGIN + 18 }],
    ])

    const paragraphs = reconstructParagraphs(lines)

    expect(paragraphs.map((p) => p.text)).toEqual([
      'La première phrase occupe deux lignes et se termine ici.',
      'Un nouveau paragraphe indenté commence.',
    ])
  })

  it('continue un paragraphe par-dessus un saut de page', () => {
    const lines = [
      ...page(1, ['Le navire quittait le port au moment où']),
      ...page(2, ['la tempête se levait sur la baie.']),
    ]

    const paragraphs = reconstructParagraphs(lines)

    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0]?.text).toBe(
      'Le navire quittait le port au moment où la tempête se levait sur la baie.',
    )
    expect(paragraphs[0]?.page).toBe(1)
  })

  it('recolle un mot coupé par un saut de page', () => {
    const lines = [...page(1, ['une inter-']), ...page(2, ['face lisible.'])]

    expect(reconstructParagraphs(lines)[0]?.text).toBe('une interface lisible.')
  })

  it('ne fusionne pas par-dessus un saut de page après une phrase terminée', () => {
    const lines = [
      ...page(1, ['Le navire quitta le port.']),
      ...page(2, ['la tempête se levait sur la baie.']),
    ]

    expect(reconstructParagraphs(lines)).toHaveLength(2)
  })

  it('ne fusionne pas quand la page suivante commence par une majuscule', () => {
    const lines = [
      ...page(1, ['Le navire quittait le port au moment où']),
      ...page(2, ['La tempête se levait sur la baie.']),
    ]

    expect(reconstructParagraphs(lines)).toHaveLength(2)
  })

  it('renvoie une liste vide sans lignes', () => {
    expect(reconstructParagraphs([])).toEqual([])
  })

  it('gère une page à ligne unique', () => {
    expect(reconstructParagraphs(page(1, ['Une seule ligne.']))).toHaveLength(1)
  })
})
