import { logEvent } from 'firebase/analytics'
import { analyticsReady } from '@/boot/firebase'
import type { Product } from '@/types'

/**
 * Eventos de negocio del catálogo (GA4 vía Firebase). Nunca se envían datos
 * personales: solo producto, categoría, término de búsqueda y origen del clic.
 */
type EventParams = Record<string, string | number | boolean | undefined | object[]>

function track(name: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return
  void analyticsReady.then((analytics) => {
    if (analytics) logEvent(analytics, name, params)
  })
}

function itemParams(p: Product) {
  return {
    item_id: p.id,
    item_name: p.name,
    item_category: p.categoryName ?? p.categoryId,
    price: p.price,
  }
}

export type WhatsAppSource = 'product_card' | 'product_detail' | 'floating_button' | 'about_page'

/** Clic en "Comprar"/WhatsApp: la conversión real del catálogo. */
export function trackWhatsAppClick(source: WhatsAppSource, product?: Product): void {
  track('whatsapp_click', {
    source,
    ...(product ? { ...itemParams(product), value: product.price, currency: product.currency || 'GTQ' } : {}),
  })
}

/** Vista de ficha (página o vista rápida). `sold` distingue interés en piezas ya vendidas. */
export function trackViewItem(product: Product): void {
  track('view_item', {
    currency: product.currency || 'GTQ',
    value: product.price,
    sold: product.sold === true,
    items: [itemParams(product)],
  })
}

/** "¿Buscas algo similar?" en un producto vendido: demanda para la lista de espera. */
export function trackAskSimilar(product: Product): void {
  track('ask_similar_click', itemParams(product))
}

/** Búsqueda; results_count = 0 indica productos que la gente pide y no hay. */
export function trackSearch(term: string, resultsCount: number): void {
  track('search', { search_term: term.trim().toLowerCase(), results_count: resultsCount })
}

export function trackSelectCategory(categoryId: string | null): void {
  track('select_category', { category_id: categoryId ?? 'all' })
}
