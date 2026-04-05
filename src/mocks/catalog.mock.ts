import type { CatalogData, Category, Product, ProductImage, StoreTheme } from 'src/types'
import type { RawCatalog } from 'src/utils/catalogData'
import {
  getRawCatalogJson,
  resolveCatalogSlug,
  resolveRawCatalog,
} from 'src/utils/catalogData'
import { slugifyCatalogText } from 'src/utils/slugify'
import { normalizeIconName } from 'src/utils/iconName'

const CDN_HOST = 'https://klugsystem-public-storage.s3.us-east-1.amazonaws.com'

function cdnAssetsBase(storeKey: string): string {
  return `${CDN_HOST}/${storeKey}/assets/`
}

function mapAllProducts(raw: RawCatalog): Product[] {
  const catNameBySlug = new Map(raw.categories.map((c) => [c.slug, c.name]))

  return raw.products.map((p, idx) => {
    const visible = p.visible !== false
    const sold = p.sold === true
    // Productos vendidos nunca aparecen como destacados.
    const featured = visible && !sold && p.featured === true

    const images: ProductImage[] = p.images.map((url, i) => ({
      url,
      alt: p.name,
      order: i + 1,
    }))

    const mapped: Product = {
      id: p.id,
      name: p.name,
      slug: slugifyCatalogText(p.name) + '-' + p.id,
      description: p.description,
      price: p.price,
      currency: raw.currency,
      images,
      categoryId: p.category,
      categoryName: catNameBySlug.get(p.category) ?? p.category,
      tags: p.tags ?? [],
      // Un producto vendido ya no está "available" para compra,
      // aunque sigue siendo `visible` en el catálogo.
      available: !sold,
      visible,
      featured,
      order: idx + 1,
    }
    if (sold) {
      mapped.sold = true
    }
    if (p.measure) {
      mapped.shortDescription = p.measure
      mapped.measure = p.measure
    }
    if (p.discount) {
      mapped.discount = p.discount
    }
    return mapped
  })
}

/** Hasta que el JSON lleve `socialLinks` / `description`, mantenemos SweetHome igual que antes. */
const SWEETHOME_SOCIAL_FALLBACK = {
  instagram: 'https://www.instagram.com/sweethome.gt_',
  facebook: 'https://www.facebook.com/profile.php?id=100091776825836',
  whatsapp: 'https://wa.me/50258705804',
}

const SWEETHOME_DESC_FALLBACK =
  'Transforma tu espacio con decoración única. Jarrones, trays, tablas de queso y piezas artesanales para cada rincón de tu hogar.'

const defaultTheme: StoreTheme = {
  primaryColor: '#000000',
  secondaryColor: '#d19793',
  accentColor: '#e9e3ca',
  backgroundColor: '#f5f5f5',
  surfaceColor: '#ffffff',
  textColor: '#000000',
  textSecondaryColor: '#6b6b6b',
  headerStyle: 'solid',
  cardStyle: 'elevated',
  borderRadius: 16,
}

function buildStoreConfig(raw: RawCatalog, fileSlug: string): CatalogData['store'] {
  const key = raw.store || fileSlug
  const base = cdnAssetsBase(key)
  const t = raw.theme ?? {}

  return {
    id: `${key}-01`,
    name: raw.name || key,
    slug: key,
    description:
      raw.description ??
      (key === 'sweethome' ? SWEETHOME_DESC_FALLBACK : `Catálogo ${raw.name || key}. Compra por WhatsApp.`),
    logo: raw.logo ?? `${base}logos/${key}-logo.webp`,
    logoInverse: raw.logoInverse ?? `${base}logos/${key}-logo-white.webp`,
    whatsappNumber:
      raw.whatsappNumber ??
      import.meta.env.VITE_WHATSAPP_DEFAULT_NUMBER ??
      '50258705804',
    whatsappMessage:
      raw.whatsappMessage ?? 'Hola! Vi un producto en su catálogo y me interesa.',
    currency: raw.currency || 'GTQ',
    locale: raw.locale ?? 'es-GT',
    theme: {
      primaryColor: t.primaryColor ?? defaultTheme.primaryColor,
      secondaryColor: t.secondaryColor ?? defaultTheme.secondaryColor,
      accentColor: t.accentColor ?? defaultTheme.accentColor,
      backgroundColor: t.backgroundColor ?? defaultTheme.backgroundColor,
      surfaceColor: t.surfaceColor ?? defaultTheme.surfaceColor,
      textColor: t.textColor ?? defaultTheme.textColor,
      textSecondaryColor: t.textSecondaryColor ?? defaultTheme.textSecondaryColor,
      headerStyle: t.headerStyle ?? defaultTheme.headerStyle,
      cardStyle: t.cardStyle ?? defaultTheme.cardStyle,
      borderRadius: t.borderRadius ?? defaultTheme.borderRadius,
    },
    socialLinks:
      raw.socialLinks ?? (key === 'sweethome' ? SWEETHOME_SOCIAL_FALLBACK : {}),
  }
}

/** Productos según JSON (sin overlays de admin). */
export function getBaseCatalogProductsWithoutOverlay(storeSlug?: string): Product[] {
  const slug = resolveCatalogSlug(storeSlug)
  const raw = getRawCatalogJson(slug)
  if (!raw) throw new Error(`Catálogo no encontrado: ${slug}`)
  return mapAllProducts(raw)
}

function buildCatalogData(raw: RawCatalog, slug: string): CatalogData {
  const categories: Category[] = raw.categories.map((c) => {
    const cat: Category = {
      id: c.slug,
      name: c.name,
      slug: c.slug,
      order: c.order,
    }
    // Normaliza nombres cortos (`faucet`) o formato completo (`fa-solid fa-faucet`)
    // al mismo formato final que espera Quasar. Soporta los dos estilos para
    // retrocompatibilidad con JSON existente.
    const icon = normalizeIconName(c.icon)
    if (icon) cat.icon = icon
    return cat
  })

  const base = mapAllProducts(raw)
  const products = base.filter((p) => p.visible !== false)

  return {
    store: buildStoreConfig(raw, slug),
    categories,
    products,
  }
}

/**
 * Carga síncrona (solo bundled JSON). Mantiene compatibilidad con callers que
 * no quieren esperar una Promise — útil para SSR/prerender o tests.
 */
export function getMockCatalog(storeSlug?: string): CatalogData {
  const slug = resolveCatalogSlug(storeSlug)
  const raw = getRawCatalogJson(slug)
  if (!raw) throw new Error(`Catálogo no encontrado: ${slug}`)
  return buildCatalogData(raw, slug)
}

/**
 * Carga preferida (async). Intenta bajar el JSON remoto desde
 * `VITE_CATALOG_REMOTE_BASE` y cae al JSON empaquetado si el remoto no está
 * disponible. Esta es la función que usa `useCatalog.loadCatalog()`.
 */
export async function loadCatalogFromSource(storeSlug?: string): Promise<CatalogData> {
  const slug = resolveCatalogSlug(storeSlug)
  const raw = (await resolveRawCatalog(slug)) ?? getRawCatalogJson(slug)
  if (!raw) throw new Error(`Catálogo no encontrado: ${slug}`)
  return buildCatalogData(raw, slug)
}

/**
 * Misma resolución que la tienda y `loadCatalogFromSource` (Sheets publicado →
 * JSON remoto → JSON empaquetado). Incluye **todos** los productos (`visible: false`
 * también) para el panel admin.
 */
export async function loadAllProductsFromResolvedSource(storeSlug?: string): Promise<{
  products: Product[]
  raw: RawCatalog
  slug: string
}> {
  const slug = resolveCatalogSlug(storeSlug)
  const raw = (await resolveRawCatalog(slug)) ?? getRawCatalogJson(slug)
  if (!raw) throw new Error(`Catálogo no encontrado: ${slug}`)
  return { products: mapAllProducts(raw), raw, slug }
}
