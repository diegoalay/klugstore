/** Slugs de producto en URL; debe coincidir con `scripts/generate-sitemap.mjs`. */
export function slugifyCatalogText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** URL pública de un producto: `{nombre-slugificado}-{id}` (app, admin, sitemap y SSG). */
export function productSlug(name: string, id: string): string {
  return `${slugifyCatalogText(name)}-${id}`
}

/**
 * Normaliza un texto para búsqueda case-insensitive y diacritic-insensitive.
 *
 * - "Canción"  → "cancion"
 * - "niño"     → "nino"
 * - "ÉPOCA"    → "epoca"
 *
 * Úsalo tanto en el query del usuario como en los campos del producto
 * (name, description, tags) antes de comparar.
 */
export function normalizeForSearch(text: string | null | undefined): string {
  if (!text) return ''
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
