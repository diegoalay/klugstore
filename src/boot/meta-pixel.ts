/**
 * Píxel de Meta (anuncios de Facebook/Instagram). Se activa solo en el navegador
 * y solo si VITE_META_PIXEL_ID está definido. No mide el admin.
 *
 * Eventos (ver utils/analytics.ts): PageView en cada navegación, ViewContent al
 * ver un producto, Search al buscar y Contact al tocar "Comprar"/WhatsApp — este
 * último es la conversión con la que se optimizan los anuncios.
 */
import { defineBoot } from '#q-app'

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: Fbq }

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

const PIXEL_ID = String(import.meta.env.VITE_META_PIXEL_ID ?? '').trim()

function loadPixel(id: string) {
  if (window.fbq) return
  // Snippet oficial de Meta, sin el <noscript> (la tienda requiere JavaScript igual).
  const fbq: Fbq = (...args: unknown[]) => {
    ;(fbq.queue ??= []).push(args)
  }
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  window.fbq = fbq
  window._fbq = fbq
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)
  fbq('init', id)
}

const isAdminPath = (path: string) => path.startsWith('/admin')

export default defineBoot(({ router }) => {
  if (typeof window === 'undefined' || !PIXEL_ID) return
  loadPixel(PIXEL_ID)
  router.afterEach((to) => {
    if (!isAdminPath(to.path)) window.fbq?.('track', 'PageView')
  })
})
