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

/** Modos extra para el panel admin (listado editable). */
export type AdminCatalogSortMode =
  | CatalogSortMode
  | 'category-asc'
  | 'id-asc'
  | 'visible-first'
  | 'hidden-first'

export const ADMIN_CATALOG_SORT_OPTIONS: { value: AdminCatalogSortMode; label: string }[] = [
  { value: 'default', label: 'Orden de la fuente (Sheet / JSON)' },
  { value: 'name-asc', label: 'Nombre A → Z' },
  { value: 'name-desc', label: 'Nombre Z → A' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'category-asc', label: 'Categoría A → Z' },
  { value: 'id-asc', label: 'ID (A → Z)' },
  { value: 'visible-first', label: 'Visibles primero' },
  { value: 'hidden-first', label: 'Ocultos primero' },
]

export function applyAdminCatalogSort(products: Product[], mode: AdminCatalogSortMode): Product[] {
  const arr = [...products]
  switch (mode) {
    case 'category-asc':
      return arr.sort((a, b) => {
        const ca = (a.categoryName ?? a.categoryId).toLowerCase()
        const cb = (b.categoryName ?? b.categoryId).toLowerCase()
        const c = ca.localeCompare(cb, 'es', { sensitivity: 'base', numeric: true })
        if (c !== 0) return c
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base', numeric: true })
      })
    case 'id-asc':
      return arr.sort((a, b) =>
        a.id.localeCompare(b.id, 'es', { sensitivity: 'base', numeric: true }),
      )
    case 'visible-first': {
      return arr.sort((a, b) => {
        const av = a.visible !== false ? 0 : 1
        const bv = b.visible !== false ? 0 : 1
        if (av !== bv) return av - bv
        return a.order - b.order
      })
    }
    case 'hidden-first': {
      return arr.sort((a, b) => {
        const av = a.visible !== false ? 0 : 1
        const bv = b.visible !== false ? 0 : 1
        if (av !== bv) return bv - av
        return a.order - b.order
      })
    }
    default:
      return applyCatalogSortMode(arr, mode)
  }
}
