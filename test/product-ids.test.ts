import { describe, expect, it, vi } from 'vitest'

vi.mock('@/boot/firebase', () => ({ storage: {} }))
const { nextProductId } = await import('@/utils/productImages')

describe('product ids', () => {
  it('continues the {category}-{nn} numbering', () => {
    expect(nextProductId('trays', ['trays-01', 'trays-27', 'vases-40'])).toBe('trays-28')
  })

  it('starts at 01 for a new category', () => {
    expect(nextProductId('christmas-season', ['trays-01'])).toBe('christmas-season-01')
  })

  it('does not confuse categories that share a prefix', () => {
    expect(nextProductId('candle', ['candle-holders-09', 'candle-02'])).toBe('candle-03')
  })
})
