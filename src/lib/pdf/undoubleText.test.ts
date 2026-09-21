import { describe, expect, it } from 'vitest'
import { undoubleText } from './undoubleText'

describe('undoubleText', () => {
  it('répare un titre de couverture dédoublé', () => {
    expect(undoubleText('CCrriimmee eett cchhââttiimmeenntt')).toBe('Crime et châtiment')
  })

  it('répare une ligne dédoublée avec ponctuation et chiffres', () => {
    expect(undoubleText('FFiiooddoorr DDoossttooïïeevvsskkii,, 11886666..')).toBe(
      'Fiodor Dostoïevski, 1866.',
    )
  })

  it('répare une ligne dont les accents sont décomposés', () => {
    // La marque combinante est doublée elle aussi : « aa◌̂◌̂ » → « a◌̂ ».
    const decomposed = 'cchhaâ̂ttiimmeenntt'
    expect(undoubleText(decomposed).normalize('NFC')).toBe('châtiment')
  })

  it('laisse la prose intacte', () => {
    const line = 'Le vieux marin regardait la mer immobile, comme si le temps'
    expect(undoubleText(line)).toBe(line)
  })

  it('laisse intacte une ligne contenant un mot à lettres doublées', () => {
    expect(undoubleText('Hawaii')).toBe('Hawaii')
    expect(undoubleText('ellee')).toBe('ellee')
  })

  it('ne touche pas une ligne où un seul mot nest pas doublé', () => {
    const line = 'CCrriimmee eett chatiment'
    expect(undoubleText(line)).toBe(line)
  })

  it('ne touche pas une abréviation comme « MM. »', () => {
    const line = 'MM. les députés'
    expect(undoubleText(line)).toBe(line)
  })

  it('ne touche pas des jetons doublés trop courts', () => {
    expect(undoubleText('aa bb')).toBe('aa bb')
    expect(undoubleText('II II')).toBe('II II')
  })

  it('ne touche pas une ligne trop courte', () => {
    expect(undoubleText('IIII')).toBe('IIII')
    expect(undoubleText('')).toBe('')
  })

  it('est idempotent', () => {
    const once = undoubleText('CCrriimmee eett cchhââttiimmeenntt')
    expect(undoubleText(once)).toBe(once)
  })
})
