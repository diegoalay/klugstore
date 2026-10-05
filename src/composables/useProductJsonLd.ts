import { unref, type Ref } from 'vue'
import { useMeta } from 'quasar'
import type { Product } from '@/types'

/**
 * Datos estructurados Product (schema.org) + precio en Open Graph para la
 * ficha activa. Vía Quasar Meta, así quedan en el HTML generado por SSR/SSG
 * (rich snippets en Google: precio, disponibilidad, imagen).
 */
export function useProductJsonLd(opts: {
  product: Ref<Product | null | undefined> | Product | null | undefined
  storeName: Ref<string> | string
  url: Ref<string> | string
}) {
  useMeta(() => {
    const product = unref(opts.product)
    if (!product) return {}
    const url = unref(opts.url)
    const currency = product.currency || 'GTQ'

    const jsonLd = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.images.map((i) => i.url),
      sku: product.id,
      url,
      brand: { '@type': 'Brand', name: unref(opts.storeName) },
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: currency,
        price: product.price,
        availability: product.sold
          ? 'https://schema.org/SoldOut'
          : product.visible
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
      },
    }

    return {
      meta: {
        productPrice: { property: 'product:price:amount', content: String(product.price) },
        productCurrency: { property: 'product:price:currency', content: currency },
      },
      script: {
        ldJsonProduct: { type: 'application/ld+json', innerHTML: JSON.stringify(jsonLd) },
      },
    }
  })
}
