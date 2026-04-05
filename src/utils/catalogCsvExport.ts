/**
 * CSV compatible con la guía de Google Sheets (mismas columnas que
 * scripts/export-catalog-to-csv.mjs).
 */
import type { Product } from 'src/types'
import type { RawCategory } from 'src/utils/catalogData'

export function csvEscape(value: unknown): string {
  const s =
    value == null
      ? ''
      : typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : ''
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','))
  }
  return `${lines.join('\n')}\n`
}

const PRODUCT_HEADERS = [
  'id',
  'category',
  'name',
  'description',
  'measure',
  'price',
  'visible',
  'featured',
  'discount',
  'tags',
  'images',
] as const

export function productsToCsvString(products: Product[]): string {
  const rows = products.map((p) => ({
    id: p.id,
    category: p.categoryId,
    name: p.name,
    description: p.description ?? '',
    measure: p.measure ?? '',
    price: p.price ?? 0,
    visible: p.visible === false ? 'FALSE' : 'TRUE',
    featured: p.featured === true ? 'TRUE' : 'FALSE',
    discount: p.discount ?? '',
    tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
    images: Array.isArray(p.images) ? p.images.map((i) => i.url).join(', ') : '',
  }))
  return toCSV([...PRODUCT_HEADERS], rows)
}

const CATEGORY_HEADERS = ['slug', 'name', 'icon', 'order'] as const

export function categoriesToCsvString(categories: RawCategory[]): string {
  const rows = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    icon: c.icon ?? '',
    order: c.order ?? 0,
  }))
  return toCSV([...CATEGORY_HEADERS], rows)
}

export function triggerCsvDownload(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
