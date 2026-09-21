import { describe, expect, it } from 'vitest'
import { joinTextSegments } from './dehyphenate'

describe('joinTextSegments', () => {
  it('recolle un mot coupé en fin de ligne', () => {
    expect(joinTextSegments('une inter-', 'face utilisable')).toBe('une interface utilisable')
  })

  it('recolle malgré les espaces de bord', () => {
    expect(joinTextSegments('une inter-  ', '  face')).toBe('une interface')
  })

  it('recolle un mot accentué', () => {
    expect(joinTextSegments('la réalis-', 'ation du projet')).toBe('la réalisation du projet')
  })

  it('joint les lignes normales par une espace', () => {
    expect(joinTextSegments('le petit chat', 'dort sur le mur')).toBe(
      'le petit chat dort sur le mur',
    )
  })

  it('garde le tiret quand la suite commence par une majuscule', () => {
    expect(joinTextSegments('le traité franco-', 'Allemand')).toBe('le traité franco-Allemand')
  })

  it('garde un tiret entouré despaces (tiret de dialogue ou incise)', () => {
    expect(joinTextSegments('il partit -', 'sans un mot')).toBe('il partit - sans un mot')
  })

  it('supprime toujours un tiret conditionnel', () => {
    expect(joinTextSegments('inter­', 'Face')).toBe('interFace')
  })

  it('garde le tiret sans espace devant un chiffre (intervalle coupé)', () => {
    expect(joinTextSegments('voir pages 11-', '12 et suivantes')).toBe(
      'voir pages 11-12 et suivantes',
    )
  })

  it('renvoie le segment non vide quand lautre est vide', () => {
    expect(joinTextSegments('', 'début')).toBe('début')
    expect(joinTextSegments('fin', '')).toBe('fin')
    expect(joinTextSegments('', '')).toBe('')
  })
})
