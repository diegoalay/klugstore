import type { Product } from 'src/types'

export type CatalogSortMode = 'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'

export const CATALOG_SORT_OPTIONS: { value: CatalogSortMode; label: string }[] = [
  { value: 'default', label: 'Orden del catálogo' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'name-asc', label: 'Nombre A → Z' },
  { value: 'name-desc', label: 'Nombre Z → A' },
]

const SORT_SET = new Set<CatalogSortMode>([
  'default',
  'price-asc',
  'price-desc',
  'name-asc',
  'name-desc',
])

export function parseCatalogSortParam(value: string | null): CatalogSortMode {
  const v = (value ?? '').trim() as CatalogSortMode
  return SORT_SET.has(v) ? v : 'default'
}

export function applyCatalogSortMode(products: Product[], mode: CatalogSortMode): Product[] {
  const arr = [...products]
  switch (mode) {
    case 'price-asc':
      return arr.sort((a, b) => a.price - b.price || a.order - b.order)
    case 'price-desc':
      return arr.sort((a, b) => b.price - a.price || a.order - b.order)
    case 'name-asc':
      return arr.sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base', numeric: true }),
      )
    case 'name-desc':
      return arr.sort((a, b) =>
        b.name.localeCompare(a.name, 'es', { sensitivity: 'base', numeric: true }),
      )
    default:
      return arr.sort((a, b) => a.order - b.order)
  }
}
