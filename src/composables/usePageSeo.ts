import { unref, type Ref } from 'vue'
import { useMeta } from 'quasar'

/** Dominio público: canonical/og:url siempre apuntan a producción, también en dev. */
export const SITE_ORIGIN = 'https://sweethome.gt'
const DEFAULT_OG_IMAGE =
  'https://klugsystem-public-storage.s3.us-east-1.amazonaws.com/sweethome/assets/images/og-image.png'

export interface PageSeoInput {
  title: Ref<string> | string
  description: Ref<string> | string
  /** Ruta absoluta del sitio, p. ej. `/catalog` o `/catalog/producto/foo` */
  path: Ref<string> | string
  /** Imagen para vista previa en WhatsApp/Facebook; por defecto la de la marca. */
  image?: Ref<string | undefined> | string | undefined
  /** `product` en fichas de producto. */
  type?: 'website' | 'product'
  /** Si true, añade noindex (p. ej. 404, admin) */
  noIndex?: Ref<boolean> | boolean
}

/**
 * Title, description, canonical y etiquetas sociales vía Quasar Meta: funciona
 * en navegador y también durante SSR/SSG, así el HTML generado ya trae la
 * vista previa correcta de cada página (lo que leen WhatsApp y Facebook).
 */
export function usePageSeo(opts: PageSeoInput) {
  useMeta(() => {
    const title = unref(opts.title)
    const description = unref(opts.description)
    const path = unref(opts.path)
    const url = `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
    const image = unref(opts.image) || DEFAULT_OG_IMAGE
    const robots = unref(opts.noIndex)
      ? 'noindex, follow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

    return {
      title,
      meta: {
        description: { name: 'description', content: description },
        robots: { name: 'robots', content: robots },
        ogType: { property: 'og:type', content: opts.type ?? 'website' },
        ogTitle: { property: 'og:title', content: title },
        ogDescription: { property: 'og:description', content: description },
        ogUrl: { property: 'og:url', content: url },
        ogImage: { property: 'og:image', content: image },
        ogImageAlt: { property: 'og:image:alt', content: title },
        twitterTitle: { name: 'twitter:title', content: title },
        twitterDescription: { name: 'twitter:description', content: description },
        twitterImage: { name: 'twitter:image', content: image },
      },
      link: {
        canonical: { rel: 'canonical', href: url },
      },
    }
  })
}

export function truncateSeoDescription(text: string, maxLen = 158): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen - 1).trim()}…`
}
