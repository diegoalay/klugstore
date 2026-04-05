import { resolveStoreSlug } from 'src/utils/storeResolver'

// ============================================
// Catálogos empaquetados (data/products/*.json)
// ============================================

export interface RawProduct {
  id: string
  category: string
  name: string
  description: string
  measure?: string
  price: number
  tags?: string[]
  images: string[]
  discount?: string | null
  visible: boolean
  /**
   * Producto vendido. Visible en el catálogo pero con la acción de compra
   * deshabilitada y un badge "Vendido". Default: `false`.
   */
  sold?: boolean
  /** Solo destacado si viene explícito en el JSON (por defecto: ninguno). */
  featured?: boolean
}

export interface RawCategory {
  slug: string
  name: string
  icon?: string
  order: number
}

export interface RawCatalog {
  store: string
  name: string
  currency: string
  /** URL canónica del sitio (sitemap, SEO). Opcional: ver también SITEMAP_BASE_URL al generar. */
  publicUrl?: string
  categories: RawCategory[]
  products: RawProduct[]
  /** Opcional: branding sin convención CDN */
  description?: string
  logo?: string
  logoInverse?: string
  whatsappNumber?: string
  whatsappMessage?: string
  locale?: string
  theme?: Partial<{
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    surfaceColor: string
    textColor: string
    textSecondaryColor: string
    headerStyle: 'solid' | 'gradient' | 'image'
    cardStyle: 'elevated' | 'flat' | 'outlined'
    borderRadius: number
  }>
  socialLinks?: Record<string, string | undefined>
}

const catalogModules = import.meta.glob<{ default: RawCatalog }>('../../data/products/*.json', {
  eager: true,
})

function buildCatalogMap(): Record<string, RawCatalog> {
  const map: Record<string, RawCatalog> = {}
  for (const path of Object.keys(catalogModules)) {
    const file = path.split('/').pop() ?? ''
    const slug = file.replace(/\.json$/i, '')
    if (!slug) continue
    const mod = catalogModules[path] as { default: RawCatalog }
    if (mod?.default) map[slug] = mod.default
  }
  return map
}

const CATALOG_BY_SLUG = buildCatalogMap()

export function listCatalogSlugs(): string[] {
  return Object.keys(CATALOG_BY_SLUG).sort()
}

export function getRawCatalogJson(slug: string): RawCatalog | null {
  return CATALOG_BY_SLUG[slug] ?? null
}

// ============================================
// Catálogo remoto (CDN / S3)
// ============================================
// Cuando existe `VITE_CATALOG_REMOTE_BASE`, el catálogo se baja en runtime desde
// esa URL. Esto permite a un editor no-técnico subir un JSON nuevo al bucket sin
// redesplegar el sitio.
//
// Convención de URL: `{BASE}/{slug}/assets/catalog.json`
// Ej: https://klugsystem-public-storage.s3.us-east-1.amazonaws.com/sweethome/assets/catalog.json
//
// Si el fetch falla (offline, 404, CORS, JSON inválido), se cae al JSON empaquetado.
// ============================================


function buildRemoteCatalogUrl(slug: string): string | null {
  const base = import.meta.env.VITE_CATALOG_REMOTE_BASE?.trim()
  if (!base) return null
  const normalized = base.replace(/\/+$/, '')
  return `${normalized}/${slug}/assets/catalog.json`
}

function isValidRawCatalog(data: unknown): data is RawCatalog {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    typeof d['store'] === 'string' &&
    Array.isArray(d['categories']) &&
    Array.isArray(d['products'])
  )
}

/**
 * Intenta bajar el catálogo remoto para `slug`. Devuelve `null` si:
 *  - no hay URL configurada (VITE_CATALOG_REMOTE_BASE vacío)
 *  - el fetch falla / responde !ok
 *  - el JSON es inválido
 *
 * Cachea el resultado exitoso en memoria hasta que el tab se recarga.
 * Incluye cache-busting con `?t=` para forzar revalidación del CDN.
 */
export async function fetchRemoteCatalogJson(slug: string): Promise<RawCatalog | null> {
  const url = buildRemoteCatalogUrl(slug)
  if (!url) return null

  try {
    const bust = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
    const res = await fetch(bust, { cache: 'no-cache' })
    if (!res.ok) {
      console.warn(`[catalog] Remote fetch ${slug} failed: HTTP ${res.status}`)
      return null
    }
    const data: unknown = await res.json()
    if (!isValidRawCatalog(data)) {
      console.warn(`[catalog] Remote JSON for ${slug} is not a valid RawCatalog`)
      return null
    }
    return data
  } catch (err) {
    console.warn(`[catalog] Remote fetch ${slug} threw:`, err)
    return null
  }
}

/**
 * Resolución unificada del catálogo, con 3 fuentes en orden de prioridad:
 *
 *   1. **Google Sheets** (via CSVs publicados) — si VITE_CATALOG_SHEETS_*_URL
 *      están definidos. La fuente más amigable para un editor no-técnico.
 *   2. **JSON remoto** (S3/CDN) — si VITE_CATALOG_REMOTE_BASE está definido.
 *   3. **JSON empaquetado** (data/products/{slug}.json) — fallback de desarrollo
 *      y red de seguridad si las otras fuentes fallan.
 *
 * Cualquier fuente que falle (red, CORS, JSON inválido) cae silenciosamente a
 * la siguiente. La app nunca se rompe; lo peor que pasa es mostrar el catálogo
 * empaquetado que el equipo técnico dejó en el último deploy.
 */
export async function resolveRawCatalog(slug: string): Promise<RawCatalog | null> {
  // Import dinámico para evitar ciclo entre catalogData y googleSheetsAdapter
  // (el adapter importa tipos de este módulo).
  const { fetchCatalogFromSheets } = await import('src/utils/googleSheetsAdapter')
  const fromSheets = await fetchCatalogFromSheets()
  if (fromSheets) return fromSheets

  return fetchRemoteCatalogJson(slug)
}

/** No-op — mantenido por compatibilidad de API. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function clearRemoteCatalogCache(slug?: string): void {
  // Sin cache en memoria; cada llamada hace fetch fresco.
}

/**
 * Slug efectivo del catálogo:
 * 1) explícito (p. ej. loadCatalog(slug))
 * 2) hostname → resolveStoreSlug() (DOMAIN_MAP, {slug}.localhost, {slug}.klugstore.app, …)
 * 3) sweethome si existe
 * 4) primer JSON en data/products
 */
export function resolveCatalogSlug(explicit?: string): string {
  if (explicit) return explicit

  const fromHost = resolveStoreSlug()
  if (fromHost) return fromHost

  if (CATALOG_BY_SLUG.sweethome) return 'sweethome'

  const slugs = listCatalogSlugs()
  const first = slugs[0]
  if (first) return first

  return 'sweethome'
}
