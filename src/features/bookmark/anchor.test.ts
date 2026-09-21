import { beforeEach, describe, expect, it } from 'vitest'
import { domPositionAt, findBlockElement, offsetWithinBlock } from './anchor'

function mount(html: string): HTMLElement {
  document.body.innerHTML = html
  return document.body
}

describe('ancrage dun marque-page', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('retrouve un bloc par son identifiant', () => {
    const root = mount('<p data-block-id="b1p1">Un</p><p data-block-id="b2p1">Deux</p>')

    expect(findBlockElement(root, 'b2p1')?.textContent).toBe('Deux')
    expect(findBlockElement(root, 'absent')).toBeNull()
  })

  it('compte loffset à travers le balisage interne', () => {
    const root = mount('<p data-block-id="b1p1">Le <em>vieux</em> marin</p>')
    const block = findBlockElement(root, 'b1p1')
    const emphasis = block?.querySelector('em')?.firstChild

    expect(block && emphasis && offsetWithinBlock(block, emphasis, 2)).toBe(5)
  })

  it('fait laller-retour entre offset et position DOM', () => {
    const root = mount('<p data-block-id="b1p1">Le <em>vieux</em> marin</p>')
    const block = findBlockElement(root, 'b1p1')
    if (!block) throw new Error('bloc absent')

    for (const offset of [0, 3, 5, 8, 12]) {
      const position = domPositionAt(block, offset)
      if (!position) throw new Error(`position absente pour ${offset}`)
      expect(offsetWithinBlock(block, position.node, position.offset)).toBe(offset)
    }
  })

  it('borne un offset qui dépasse la fin du bloc', () => {
    const root = mount('<p data-block-id="b1p1">Court</p>')
    const block = findBlockElement(root, 'b1p1')
    if (!block) throw new Error('bloc absent')

    const position = domPositionAt(block, 999)

    expect(position?.offset).toBe(5)
  })

  it('renvoie null sur un bloc sans texte', () => {
    const root = mount('<p data-block-id="b1p1"></p>')
    const block = findBlockElement(root, 'b1p1')

    expect(block && domPositionAt(block, 0)).toBeNull()
  })
})
