import type { Product } from 'src/types'
import { slugifyCatalogText } from 'src/utils/slugify'

export const ADMIN_SESSION_KEY = 'ks-admin-auth'

export type AdminProductOverlay = {
  name?: string
  description?: string
  price?: number
  visible?: boolean
  /** Marca el producto como vendido: visible pero sin acción de compra. */
  sold?: boolean
  measure?: string
  discount?: string | null
  tags?: string[]
  /** URLs en orden (como en el JSON). */
  images?: string[]
}

/** Alta completa para IDs nuevos (no estaban en el JSON base al abrir el admin). */
export type AdminAddedProductPayload = {
  category: string
  name: string
  description: string
  measure?: string
  price: number
  visible: boolean
  featured?: boolean
  sold?: boolean
  discount?: string | null
  tags?: string[]
  images: string[]
}

/** Formato del archivo que genera «Exportar overlay JSON». */
export type AdminCatalogOverlayFile = {
  v: 1
  products: Record<string, AdminProductOverlay>
  /** IDs que existían en la base al cargar y ya no están en el borrador. */
  removedIds?: string[]
  /** Productos nuevos (id → fila tipo JSON de catálogo). */
  addedProducts?: Record<string, AdminAddedProductPayload>
}

function productToAddedPayload(p: Product): AdminAddedProductPayload {
  const o: AdminAddedProductPayload = {
    category: p.categoryId,
    name: p.name,
    description: p.description ?? '',
    price: p.price,
    visible: p.visible !== false,
    images: (p.images ?? []).map((i) => i.url),
  }
  if (p.measure) o.measure = p.measure
  if (p.featured === true) o.featured = true
  if (p.sold === true) o.sold = true
  if (p.discount != null && p.discount !== '') o.discount = p.discount
  if (p.tags?.length) o.tags = [...p.tags]
  return o
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
  if (o.sold !== undefined) {
    if (o.sold) {
      next.sold = true
      next.available = false
    } else {
      delete next.sold
      next.available = true
    }
  }
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

/** Útil si en el futuro se aplica un overlay en memoria o en tests. */
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

/** Diff borrador vs JSON base → overlay para exportar (solo campos cambiados). */
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
    const soldNext = p.sold === true
    const soldBase = b.sold === true
    if (soldNext !== soldBase) patch.sold = soldNext
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

/** Export completo: parches, altas y bajas respecto al snapshot base. */
export function buildFullAdminExport(draft: Product[], base: Product[]): AdminCatalogOverlayFile {
  const baseById = new Map(base.map((p) => [p.id, p]))
  const draftById = new Map(draft.map((p) => [p.id, p]))
  const products = buildAdminOverlayFromDraft(draft, base)

  const removedIds: string[] = []
  for (const id of baseById.keys()) {
    if (!draftById.has(id)) removedIds.push(id)
  }

  const addedProducts: Record<string, AdminAddedProductPayload> = {}
  for (const p of draft) {
    if (!baseById.has(p.id)) {
      addedProducts[p.id] = productToAddedPayload(p)
    }
  }

  const file: AdminCatalogOverlayFile = { v: 1, products }
  if (removedIds.length) file.removedIds = removedIds
  if (Object.keys(addedProducts).length) file.addedProducts = addedProducts
  return file
}
