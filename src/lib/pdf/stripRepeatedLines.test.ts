import { describe, expect, it } from 'vitest'
import { stripRepeatedLines } from './stripRepeatedLines'
import type { PositionedLine } from './types'

function bookPage(pageNumber: number, body: string[], header = 'Les Misérables'): PositionedLine[] {
  const texts = [header, ...body, String(pageNumber)]
  return texts.map((text, index) => ({
    page: pageNumber,
    text,
    x: 72,
    y: 720 - index * 14,
    fontSize: 11,
  }))
}

describe('stripRepeatedLines', () => {
  it('supprime len-tête répété et le numéro de page', () => {
    const lines = [
      ...bookPage(1, ['Première ligne du corps.']),
      ...bookPage(2, ['Deuxième ligne du corps.']),
      ...bookPage(3, ['Troisième ligne du corps.']),
      ...bookPage(4, ['Quatrième ligne du corps.']),
    ]

    const kept = stripRepeatedLines(lines)

    expect(kept.map((line) => line.text)).toEqual([
      'Première ligne du corps.',
      'Deuxième ligne du corps.',
      'Troisième ligne du corps.',
      'Quatrième ligne du corps.',
    ])
  })

  const BODY = [
    ['Le vent se lève sur la falaise.', 'Les mouettes tournent au large.', 'La mer reste grise.'],
    ['Un homme marche vers le phare.', 'Sa lanterne oscille.', 'Le sentier descend.'],
    ['La porte grince longuement.', 'Personne ne répond à lintérieur.', 'Il entre quand même.'],
    ['Lescalier tourne sur lui-même.', 'Chaque marche craque.', 'La lumière faiblit.'],
    ['En haut, la lampe est éteinte.', 'Le gardien a disparu.', 'Le registre reste ouvert.'],
  ]

  it('supprime un pied de page numéroté de la forme « Page 3 sur 5 »', () => {
    const lines = [1, 2, 3, 4, 5].flatMap((pageNumber) =>
      [...(BODY[pageNumber - 1] ?? []), `Page ${pageNumber} sur 5`].map((text, index) => ({
        page: pageNumber,
        text,
        x: 72,
        y: 700 - index * 14,
        fontSize: 11,
      })),
    )

    const kept = stripRepeatedLines(lines)

    expect(kept.some((line) => line.text.startsWith('Page '))).toBe(false)
    expect(kept).toHaveLength(15)
  })

  it('ne prend pas une ligne de corps longue pour un en-tête', () => {
    const repeated =
      'Cette ligne de corps est bien trop longue pour être confondue avec un en-tête courant, même répétée.'
    const lines = [1, 2, 3, 4].flatMap((pageNumber) =>
      [repeated, BODY[pageNumber - 1]?.[0] ?? ''].map((text, index) => ({
        page: pageNumber,
        text,
        x: 72,
        y: 700 - index * 14,
        fontSize: 11,
      })),
    )

    expect(stripRepeatedLines(lines)).toHaveLength(8)
  })

  it('garde le corps du texte même sil ressemble à un en-tête', () => {
    const lines = [
      ...bookPage(1, ['Un paragraphe unique.']),
      ...bookPage(2, ['Un autre paragraphe.']),
      ...bookPage(3, ['Encore un paragraphe.']),
    ]

    const kept = stripRepeatedLines(lines)

    expect(kept.map((line) => line.text)).toContain('Un paragraphe unique.')
  })

  it('ne supprime rien sur un document trop court', () => {
    const lines = [...bookPage(1, ['Corps.']), ...bookPage(2, ['Corps.'])]

    expect(stripRepeatedLines(lines)).toHaveLength(lines.length)
  })

  it('ne supprime pas un en-tête présent sur une minorité de pages', () => {
    const lines = [
      ...bookPage(1, ['Corps un.'], 'Avant-propos'),
      ...bookPage(2, ['Corps deux.'], 'Chapitre I'),
      ...bookPage(3, ['Corps trois.'], 'Chapitre II'),
      ...bookPage(4, ['Corps quatre.'], 'Chapitre III'),
    ]

    const kept = stripRepeatedLines(lines)

    expect(kept.map((line) => line.text)).toContain('Avant-propos')
  })
})
