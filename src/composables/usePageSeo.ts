import { watchEffect, type Ref } from 'vue'
import { unref } from 'vue'

export interface PageSeoInput {
  title: Ref<string> | string
  description: Ref<string> | string
  /** Ruta absoluta del sitio, p. ej. `/catalog` o `/catalog/producto/foo` */
  path: Ref<string> | string
  /** Si true, añade noindex (p. ej. 404) */
  noIndex?: Ref<boolean> | boolean
}

function setMetaContent(selector: string, content: string) {
  const el = document.querySelector(selector)
  if (el) el.setAttribute('content', content)
}

function setLinkHref(rel: string, href: string) {
  const el = document.querySelector(`link[rel="${rel}"]`)
  if (el) el.setAttribute('href', href)
}

/**
 * Actualiza title, description, canonical y etiquetas sociales básicas (SPA).
 */
export function usePageSeo(opts: PageSeoInput) {
  watchEffect(() => {
    const title = unref(opts.title)
    const description = unref(opts.description)
    const path = unref(opts.path)
    const noIndex = unref(opts.noIndex) ?? false

    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://sweethome.com.gt'
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = `${origin}${normalizedPath}`

    document.title = title

    setMetaContent('meta[name="description"]', description)

    if (noIndex) {
      setMetaContent('meta[name="robots"]', 'noindex, follow')
    } else {
      setMetaContent(
        'meta[name="robots"]',
        'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      )
    }

    setLinkHref('canonical', url)

    setMetaContent('meta[property="og:title"]', title)
    setMetaContent('meta[property="og:description"]', description)
    setMetaContent('meta[property="og:url"]', url)

    setMetaContent('meta[name="twitter:title"]', title)
    setMetaContent('meta[name="twitter:description"]', description)
    setMetaContent('meta[name="twitter:url"]', url)
  })
}

export function truncateSeoDescription(text: string, maxLen = 158): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen - 1).trim()}…`
}
