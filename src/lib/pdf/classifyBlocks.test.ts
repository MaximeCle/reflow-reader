import { describe, expect, it } from 'vitest'
import { classifyBlocks } from './classifyBlocks'
import type { RawParagraph } from './reconstructParagraphs'

function paragraph(text: string, fontSize: number, footnote = false): RawParagraph {
  return { text, page: 1, fontSize, lineCount: 1, footnote }
}

const body = (text: string) => paragraph(text, 11)

describe('classifyBlocks', () => {
  it('classe les blocs selon la taille de police', () => {
    const paragraphs = [
      paragraph('Première partie', 20),
      paragraph('Un sous-titre', 13),
      body('Le corps du texte, qui occupe lessentiel du document et fixe la taille de référence.'),
      body('Un second paragraphe de corps, également dans la taille dominante du document.'),
    ]

    expect(classifyBlocks(paragraphs).map((p) => p.kind)).toEqual([
      'heading-2',
      'heading-3',
      'paragraph',
      'paragraph',
    ])
  })

  it('ne prend pas un long bloc pour un titre', () => {
    const long = 'Mot '.repeat(80)
    const paragraphs = [
      paragraph(long, 20),
      body('Corps du texte dominant, répété pour peser dans la taille de référence.'),
      body('Encore du corps de texte pour asseoir la taille dominante du document.'),
    ]

    expect(classifyBlocks(paragraphs)[0]?.kind).toBe('paragraph')
  })

  it('laisse tout en paragraphe quand la taille est uniforme', () => {
    const paragraphs = [body('Un paragraphe.'), body('Un autre.'), body('Un troisième.')]

    expect(classifyBlocks(paragraphs).every((p) => p.kind === 'paragraph')).toBe(true)
  })

  it('type les notes de bas de page', () => {
    const paragraphs = [
      paragraph('Un titre', 20),
      body('Le corps du texte dominant, assez long pour fixer la taille de référence.'),
      body('Un second paragraphe de corps dans la taille dominante du document.'),
      paragraph('1. Voir à ce sujet lédition de 1866.', 8.5, true),
    ]

    expect(classifyBlocks(paragraphs).map((p) => p.kind)).toEqual([
      'heading-2',
      'paragraph',
      'paragraph',
      'footnote',
    ])
  })

  it('ne laisse pas les notes fausser la taille de référence', () => {
    // Beaucoup de notes, peu de corps : le corps reste la référence.
    const paragraphs = [
      body('Un paragraphe de corps.'),
      ...Array.from({ length: 8 }, (_, i) =>
        paragraph(`${i + 1}. Une note assez longue pour peser dans le calcul des poids.`, 8, true),
      ),
      paragraph('Un titre de chapitre', 16),
    ]

    const kinds = classifyBlocks(paragraphs).map((p) => p.kind)

    expect(kinds[0]).toBe('paragraph')
    expect(kinds.at(-1)).toBe('heading-2')
  })

  it('gère une liste vide', () => {
    expect(classifyBlocks([])).toEqual([])
  })
})
