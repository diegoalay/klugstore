import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { makeProduct } from './fixtures'

vi.mock('@/boot/firebase', () => ({ db: {}, storage: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDocs: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => 'ts'),
}))

const { useAdminFirestoreCatalogStore } = await import('@/stores/admin-firestore-catalog-store')

describe('admin catalog store keeps its local copy in sync', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('reflects saved changes without reloading (reopening shows the new data)', async () => {
    const store = useAdminFirestoreCatalogStore()
    store.categories = [{ slug: 'vases', name: 'Jarrones y Floreros', order: 1 }]
    store.products = [makeProduct({ id: 'vases-01', name: 'Florero', price: 150 })]

    await store.saveProduct({ ...store.products[0]!, name: 'Florero rústico', price: 175, sold: true })

    const p = store.products.find((x) => x.id === 'vases-01')
    expect(p?.name).toBe('Florero rústico')
    expect(p?.price).toBe(175)
    expect(p?.sold).toBe(true)
    expect(p?.available).toBe(false)
    expect(store.products).toHaveLength(1)
  })

  it('adds a created product with the same shape as loaded ones', async () => {
    const store = useAdminFirestoreCatalogStore()
    store.categories = [{ slug: 'vases', name: 'Jarrones y Floreros', order: 1 }]
    await store.createProduct('vases-02', makeProduct({ id: 'vases-02', name: 'Jarrón dorado' }))
    expect(store.products.map((p) => [p.id, p.categoryName, p.slug])).toEqual([
      ['vases-02', 'Jarrones y Floreros', 'jarron-dorado-vases-02'],
    ])
  })
})
