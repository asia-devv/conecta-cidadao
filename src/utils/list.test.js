import { describe, expect, it } from 'vitest'
import { toggleItem } from './list.js'

describe('toggleItem', () => {
  it('acrescenta o item ausente no fim e remove o presente, sem alterar a original', () => {
    const list = ['a', 'b']
    expect(toggleItem(list, 'c')).toEqual(['a', 'b', 'c'])
    expect(toggleItem(list, 'a')).toEqual(['b'])
    expect(list).toEqual(['a', 'b'])
  })
})
