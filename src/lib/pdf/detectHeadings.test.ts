import { describe, expect, it } from 'vitest'
import { detectHeadings } from './detectHeadings'
import type { RawParagraph } from './reconstructParagraphs'

function paragraph(text: string, fontSize: number): RawParagraph {
  return { text, page: 1, fontSize, lineCount: 1 }
}

const body = (text: string) => paragraph(text, 11)

describe('detectHeadings', () => {
  it('classe les blocs selon la taille de police', () => {
    const paragraphs = [
      paragraph('Première partie', 20),
      paragraph('Un sous-titre', 13),
      body('Le corps du texte, qui occupe lessentiel du document et fixe la taille de référence.'),
      body('Un second paragraphe de corps, également dans la taille dominante du document.'),
    ]

    expect(detectHeadings(paragraphs).map((p) => p.kind)).toEqual([
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

    expect(detectHeadings(paragraphs)[0]?.kind).toBe('paragraph')
  })

  it('laisse tout en paragraphe quand la taille est uniforme', () => {
    const paragraphs = [body('Un paragraphe.'), body('Un autre.'), body('Un troisième.')]

    expect(detectHeadings(paragraphs).every((p) => p.kind === 'paragraph')).toBe(true)
  })

  it('gère une liste vide', () => {
    expect(detectHeadings([])).toEqual([])
  })
})
