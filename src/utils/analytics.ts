import type { Product } from '@/types'
import { loadFirebase } from '@/utils/firebaseLazy'

/**
 * Eventos de negocio del catálogo (GA4 vía Firebase). Nunca se envían datos
 * personales: solo producto, categoría, término de búsqueda y origen del clic.
 */
type EventParams = Record<string, string | number | boolean | undefined | object[]>

function track(name: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return
  // Firebase se carga diferido (utils/firebaseLazy): un evento previo a la carga la
  // dispara y espera a que termine; no se pierde.
  void Promise.all([loadFirebase(), import('firebase/analytics')])
    .then(async ([{ analyticsReady }, { logEvent }]) => {
      const analytics = await analyticsReady
      if (analytics) logEvent(analytics, name, params)
    })
    .catch(() => undefined)
}

/** Evento estándar del píxel de Meta (si está cargado; ver boot/meta-pixel.ts). */
function metaTrack(
  event: 'ViewContent' | 'Search' | 'Contact',
  params: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return
  window.fbq?.('track', event, params)
}

function itemParams(p: Product) {
  return {
    item_id: p.id,
    item_name: p.name,
    item_category: p.categoryName ?? p.categoryId,
    price: p.price,
  }
}

export type WhatsAppSource =
  'product_card' | 'product_detail' | 'floating_button' | 'about_page' | 'faq_page'

/** Clic en "Comprar"/WhatsApp: la conversión real del catálogo. */
export function trackWhatsAppClick(source: WhatsAppSource, product?: Product): void {
  track('whatsapp_click', {
    source,
    ...(product
      ? { ...itemParams(product), value: product.price, currency: product.currency || 'GTQ' }
      : {}),
  })
  // Conversión para optimizar anuncios en Meta: alguien abrió WhatsApp para comprar.
  metaTrack('Contact', {
    content_category: source,
    ...(product
      ? {
          content_ids: [product.id],
          content_name: product.name,
          value: product.price,
          currency: product.currency || 'GTQ',
        }
      : {}),
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
  metaTrack('ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    content_category: product.categoryName ?? product.categoryId,
    value: product.price,
    currency: product.currency || 'GTQ',
  })
}

/** "¿Buscas algo similar?" en un producto vendido: demanda para la lista de espera. */
export function trackAskSimilar(product: Product): void {
  track('ask_similar_click', itemParams(product))
}

/** Búsqueda; results_count = 0 indica productos que la gente pide y no hay. */
export function trackSearch(term: string, resultsCount: number): void {
  track('search', { search_term: term.trim().toLowerCase(), results_count: resultsCount })
  metaTrack('Search', { search_string: term.trim().toLowerCase() })
}

export function trackSelectCategory(categoryId: string | null): void {
  track('select_category', { category_id: categoryId ?? 'all' })
}
