import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SOLD_CATEGORY_ID, useCatalogStore } from '@/stores/catalog-store'
import { makeCategory, makeProduct } from './fixtures'

describe('public catalog store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function seed() {
    const store = useCatalogStore()
    store.setCategories([
      makeCategory({ id: 'vases', order: 1 }),
      makeCategory({ id: 'garden', name: 'Jardín', order: 2 }),
      makeCategory({ id: 'faucets', name: 'Grifos', order: 3 }),
    ])
    store.setProducts([
      makeProduct({ id: 'vases-01', name: 'Florero rústico', categoryId: 'vases' }),
      makeProduct({ id: 'vases-02', name: 'Jarrón dorado', categoryId: 'vases' }),
      makeProduct({ id: 'garden-01', name: 'Gnomo', categoryId: 'garden', available: false, sold: true }),
      makeProduct({ id: 'faucets-01', name: 'Grifo cascada', categoryId: 'faucets', tags: ['baño'] }),
    ])
    return store
  }

  it('hides sold products from the listing', () => {
    const store = seed()
    expect(store.filteredProducts.map((p) => p.id)).not.toContain('garden-01')
    expect(store.filteredProducts).toHaveLength(3)
  })

  it('keeps sold products reachable by direct link', () => {
    const store = seed()
    expect(store.getProductBySlug('Gnomo-garden-01')?.id).toBe('garden-01')
  })

  it('hides categories that only have sold products', () => {
    const store = seed()
    expect(store.categoriesWithStock.map((c) => c.id)).toEqual(['vases', 'faucets'])
  })

  it('lists only sold pieces in the "Vendidos" tab', () => {
    const store = seed()
    store.setActiveCategory(SOLD_CATEGORY_ID)
    expect(store.filteredProducts.map((p) => p.id)).toEqual(['garden-01'])
    expect(store.soldProducts).toHaveLength(1)
  })

  it('defaults to the category order defined in the admin, then by name', () => {
    const store = seed()
    store.setCategories([
      makeCategory({ id: 'faucets', name: 'Grifos', order: 1 }),
      makeCategory({ id: 'vases', order: 2 }),
      makeCategory({ id: 'garden', name: 'Jardín', order: 3 }),
    ])
    expect(store.catalogSort).toBe('default')
    expect(store.filteredProducts.map((p) => p.id)).toEqual(['faucets-01', 'vases-01', 'vases-02'])
  })

  it('filters by the active category', () => {
    const store = seed()
    store.setActiveCategory('faucets')
    expect(store.filteredProducts.map((p) => p.id)).toEqual(['faucets-01'])
  })

  it('searches name and tags ignoring accents', () => {
    const store = seed()
    store.setSearchQuery('jarron')
    expect(store.filteredProducts.map((p) => p.id)).toEqual(['vases-02'])
    store.setSearchQuery('BANO')
    expect(store.filteredProducts.map((p) => p.id)).toEqual(['faucets-01'])
  })
})
