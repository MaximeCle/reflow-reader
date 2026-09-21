import { describe, expect, it } from 'vitest'
import { detectFootnotes, startsFootnote } from './detectFootnotes'
import type { PositionedLine } from './types'

const BODY_SIZE = 11
const NOTE_SIZE = 8.5

function page(
  pageNumber: number,
  entries: Array<string | [string, number]>,
  startY = 700,
): PositionedLine[] {
  return entries.map((entry, index) => {
    const [text, fontSize] = Array.isArray(entry) ? entry : [entry, BODY_SIZE]
    return { page: pageNumber, text, x: 72, y: startY - index * 14, fontSize }
  })
}

const noteFlags = (lines: PositionedLine[]) => lines.map((line) => line.footnote === true)

describe('detectFootnotes', () => {
  it('repère le bloc de notes qui ferme une page', () => {
    const lines = page(1, [
      'Le vieux marin regardait la mer immobile, comme si le',
      'temps avait cessé de couler sur le pont du navire.',
      'On entendait au loin le bruit sourd des vagues.',
      ['1. Voir à ce sujet lédition de 1866.', NOTE_SIZE],
      ['2. Lauteur y revient au chapitre suivant.', NOTE_SIZE],
    ])

    expect(noteFlags(detectFootnotes(lines))).toEqual([false, false, false, true, true])
  })

  it('ne marque pas du petit texte au milieu de la page', () => {
    const lines = page(1, [
      'Première ligne du corps du texte, dans la taille dominante.',
      ['Une citation en petits caractères au milieu de la page.', NOTE_SIZE],
      'Le corps du texte reprend ensuite sur plusieurs lignes.',
      'Et se poursuit jusquau bas de la page sans note.',
    ])

    expect(noteFlags(detectFootnotes(lines))).toEqual([false, false, false, false])
  })

  it('ne marque rien quand la page est entièrement en petits caractères', () => {
    const lines = [
      ...page(1, [
        'Un paragraphe de corps qui fixe la taille dominante du document.',
        'Une deuxième ligne de corps, toujours dans la taille dominante.',
        'Une troisième ligne de corps pour asseoir la référence.',
      ]),
      ...page(2, [
        ['Une page entière de notes, en petits caractères.', NOTE_SIZE],
        ['Elle ne doit pas être grisée dun bloc.', NOTE_SIZE],
        ['Le lecteur doit pouvoir la lire normalement.', NOTE_SIZE],
      ]),
    ]

    expect(noteFlags(detectFootnotes(lines)).slice(3)).toEqual([false, false, false])
  })

  it('ne marque pas une page sans petits caractères', () => {
    const lines = page(1, ['Une ligne.', 'Une autre ligne.', 'Une troisième ligne.'])

    expect(noteFlags(detectFootnotes(lines))).toEqual([false, false, false])
  })

  it('ne marque pas un titre, plus grand que le corps', () => {
    const lines = page(1, [
      'Une ligne de corps pour fixer la taille dominante du document.',
      'Une autre ligne de corps, toujours dans la taille dominante.',
      ['Chapitre second', 20],
    ])

    expect(noteFlags(detectFootnotes(lines))).toEqual([false, false, false])
  })

  it('gère une liste vide', () => {
    expect(detectFootnotes([])).toEqual([])
  })
})

describe('startsFootnote', () => {
  it('reconnaît les marqueurs usuels', () => {
    expect(startsFootnote('1. Une note.')).toBe(true)
    expect(startsFootnote('12) Une autre note.')).toBe(true)
    expect(startsFootnote('* Note signalée par un astérisque.')).toBe(true)
    expect(startsFootnote('† Note signalée par une croix.')).toBe(true)
  })

  it('ne confond pas avec du texte courant', () => {
    expect(startsFootnote('Le vieux marin regardait la mer.')).toBe(false)
    expect(startsFootnote('1866 fut une année décisive.')).toBe(false)
    expect(startsFootnote('')).toBe(false)
  })
})
