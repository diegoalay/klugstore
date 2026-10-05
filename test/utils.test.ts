import { describe, expect, it } from 'vitest'
import { normalizeForSearch, productSlug, slugifyCatalogText } from '@/utils/slugify'
import { formatCurrency } from '@/utils/format'
import { normalizeIconName } from '@/utils/iconName'
import { CATEGORY_ICON_OPTIONS, categoryIconClass } from '@/utils/categoryIcons'

describe('slugify', () => {
  it('strips accents and punctuation into a URL-safe slug', () => {
    expect(slugifyCatalogText('Corona de Otoño, decorativa!')).toBe('corona-de-otono-decorativa')
  })

  it('builds the public product URL as name slug + id', () => {
    expect(productSlug('Calabaza Blanca con Tapadera', 'autumn-season-08')).toBe(
      'calabaza-blanca-con-tapadera-autumn-season-08',
    )
  })

  it('normalizes search text ignoring case and accents', () => {
    expect(normalizeForSearch('JARRÓN Niño')).toBe('jarron nino')
    expect(normalizeForSearch(null)).toBe('')
  })
})

describe('formatCurrency', () => {
  it('formats quetzales by default', () => {
    expect(formatCurrency(1500).replace(/\s/g, ' ')).toMatch(/Q\s?1,500\.00/)
  })
})

describe('category icons', () => {
  it('expands a plain Font Awesome name to the solid style', () => {
    expect(normalizeIconName('leaf-maple')).toBe('fa-solid fa-leaf-maple')
    expect(normalizeIconName('fa-regular fa-heart')).toBe('fa-regular fa-heart')
    expect(normalizeIconName('  ')).toBeUndefined()
  })

  it('falls back to a tag icon when the category has none', () => {
    expect(categoryIconClass(undefined)).toBe('fa-solid fa-tag')
  })

  it('offers each icon only once in the picker', () => {
    const values = CATEGORY_ICON_OPTIONS.map((o) => o.value)
    expect(new Set(values).size).toBe(values.length)
  })
})
