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

/**
 * Slug efectivo del catálogo:
 * 1) explícito (p. ej. loadCatalog(slug))
 * 2) hostname → resolveStoreSlug() (DOMAIN_MAP, {slug}.localhost, {slug}.klugstore.app, …)
 * 3) sweethome si existe
 * 4) primer JSON en data/products
 */
export function resolveCatalogSlug(explicit?: string): string {
  if (explicit && CATALOG_BY_SLUG[explicit]) return explicit

  const fromHost = resolveStoreSlug()
  if (CATALOG_BY_SLUG[fromHost]) return fromHost

  if (CATALOG_BY_SLUG.sweethome) return 'sweethome'

  const slugs = listCatalogSlugs()
  const first = slugs[0]
  if (first) return first

  throw new Error(
    'No hay ningún catálogo en data/products/*.json. Añade al menos un archivo JSON.',
  )
}
