import { beforeEach, describe, expect, it } from 'vitest'
import { defaultSettings, loadSettings, saveSettings } from './settings'

const KEY = 'reflow-reader:settings'

describe('réglages de lecture', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('relit ce qui a été enregistré', () => {
    saveSettings({ fontSize: 22, theme: 'dark', font: 'source-serif' })

    expect(loadSettings()).toEqual({ fontSize: 22, theme: 'dark', font: 'source-serif' })
  })

  it('utilise Literata par défaut', () => {
    expect(defaultSettings().font).toBe('literata')
    expect(loadSettings().font).toBe('literata')
  })

  it('retombe sur les valeurs par défaut pour une police inconnue', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ fontSize: 18, font: 'comic-sans' }))

    expect(loadSettings().font).toBe('literata')
    expect(loadSettings().fontSize).toBe(18)
  })

  it('borne une taille de texte hors limites', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ fontSize: 900 }))
    expect(loadSettings().fontSize).toBe(24)

    window.localStorage.setItem(KEY, JSON.stringify({ fontSize: 2 }))
    expect(loadSettings().fontSize).toBe(16)
  })

  it('survit à un contenu illisible', () => {
    window.localStorage.setItem(KEY, 'pas du JSON')

    expect(loadSettings()).toEqual(defaultSettings())
  })
})
