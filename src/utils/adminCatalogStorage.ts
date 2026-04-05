import type { Product } from 'src/types'
import { slugifyCatalogText } from 'src/utils/slugify'

export const ADMIN_SESSION_KEY = 'ks-admin-auth'

const overlayKey = (storeSlug: string) => `ks-admin-catalog-overlay:${storeSlug}`

export type AdminProductOverlay = {
  name?: string
  description?: string
  price?: number
  visible?: boolean
  measure?: string
  discount?: string | null
  tags?: string[]
  /** URLs en orden (como en el JSON). */
  images?: string[]
}

export type AdminCatalogOverlayFile = {
  v: 1
  products: Record<string, AdminProductOverlay>
}

export function loadAdminCatalogOverlay(storeSlug: string): AdminCatalogOverlayFile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(overlayKey(storeSlug))
    if (!raw) return null
    const parsed = JSON.parse(raw) as AdminCatalogOverlayFile
    if (parsed?.v !== 1 || typeof parsed.products !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function saveAdminCatalogOverlay(storeSlug: string, products: Record<string, AdminProductOverlay>) {
  const payload: AdminCatalogOverlayFile = { v: 1, products }
  localStorage.setItem(overlayKey(storeSlug), JSON.stringify(payload))
}

export function clearAdminCatalogOverlay(storeSlug: string) {
  localStorage.removeItem(overlayKey(storeSlug))
}

export function isAdminSessionActive(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'
}

export function setAdminSession(active: boolean) {
  if (active) sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
  else sessionStorage.removeItem(ADMIN_SESSION_KEY)
}

function mergeOverlayIntoProduct(p: Product, o: AdminProductOverlay): Product {
  const next: Product = { ...p }
  if (o.name !== undefined) {
    const nm = o.name
    next.name = nm
    next.slug = slugifyCatalogText(nm) + '-' + p.id
    if (o.images === undefined) {
      next.images = next.images.map((img, i) => ({
        ...img,
        alt: i === 0 ? nm : (img.alt ?? ''),
      }))
    }
  }
  if (o.images !== undefined) {
    const nm = next.name
    next.images = o.images.map((url, i) => ({
      url,
      alt: nm,
      order: i + 1,
    }))
  }
  if (o.description !== undefined) next.description = o.description
  if (o.price !== undefined) next.price = o.price
  if (o.visible !== undefined) next.visible = o.visible
  if (o.measure !== undefined) {
    if (o.measure) {
      next.measure = o.measure
      next.shortDescription = o.measure
    } else {
      delete next.measure
      delete next.shortDescription
    }
  }
  if (o.discount !== undefined) next.discount = o.discount
  if (o.tags !== undefined) next.tags = o.tags
  return next
}

export function applyAdminOverlaysToProducts(
  products: Product[],
  overlay: AdminCatalogOverlayFile | null,
): Product[] {
  if (!overlay?.products) return products
  return products.map((p) => {
    const o = overlay.products[p.id]
    return o ? mergeOverlayIntoProduct(p, o) : p
  })
}

/** Diff draft vs JSON base → overlay a guardar (solo campos cambiados). */
export function buildAdminOverlayFromDraft(
  draft: Product[],
  baseWithoutOverlay: Product[],
): Record<string, AdminProductOverlay> {
  const baseById = new Map(baseWithoutOverlay.map((p) => [p.id, p]))
  const out: Record<string, AdminProductOverlay> = {}

  for (const p of draft) {
    const b = baseById.get(p.id)
    if (!b) continue
    const patch: AdminProductOverlay = {}
    if (p.name !== b.name) patch.name = p.name
    if (p.description !== b.description) patch.description = p.description
    if (p.price !== b.price) patch.price = p.price
    if (p.visible !== b.visible) patch.visible = p.visible
    const m = p.measure ?? ''
    const bm = b.measure ?? ''
    if (m !== bm) patch.measure = m
    const d = p.discount ?? null
    const bd = b.discount ?? null
    if (d !== bd) patch.discount = d
    const tagsEqual = JSON.stringify(p.tags ?? []) === JSON.stringify(b.tags ?? [])
    if (!tagsEqual) patch.tags = p.tags ? [...p.tags] : []
    const urls = (p.images ?? []).map((i) => i.url)
    const bu = (b.images ?? []).map((i) => i.url)
    if (JSON.stringify(urls) !== JSON.stringify(bu)) patch.images = urls

    if (Object.keys(patch).length) out[p.id] = patch
  }
  return out
}
