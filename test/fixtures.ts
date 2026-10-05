import type { Category, Product } from '@/types'

export function makeProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? 'vases-01'
  const name = overrides.name ?? 'Florero de cerámica'
  return {
    id,
    name,
    slug: `${name}-${id}`,
    description: 'Pieza decorativa',
    price: 150,
    currency: 'GTQ',
    images: [],
    categoryId: 'vases',
    categoryName: 'Jarrones y Floreros',
    tags: [],
    available: true,
    visible: true,
    order: 0,
    ...overrides,
  }
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
  const id = overrides.id ?? 'vases'
  return { id, slug: id, name: 'Jarrones y Floreros', order: 1, ...overrides }
}
