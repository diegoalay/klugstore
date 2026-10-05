import { computed } from 'vue'
import { useStoreConfigStore } from '@/stores'
import type { Product } from '@/types'
import { formatCurrency } from '@/utils/format'
import { trackAskSimilar, trackWhatsAppClick, type WhatsAppSource } from '@/utils/analytics'

export function useWhatsApp() {
  const storeConfig = useStoreConfigStore()

  const whatsappNumber = computed(() => storeConfig.whatsappNumber)

  function productUrl(product: Product): string {
    return `${window.location.origin}/catalog/producto/${product.slug}`
  }

  function buildProductMessage(product: Product): string {
    const price = formatCurrency(product.price, product.currency || storeConfig.currency)
    const lines = [
      '¡Hola! Me interesa este producto:',
      '',
      `*${product.name}*`,
      ...(product.measure ? [`Medidas: ${product.measure}`] : []),
      `Precio: ${price}`,
      productUrl(product),
      '',
      '¿Está disponible? También me gustaría saber el costo de envío a mi zona.',
    ]
    return lines.join('\n')
  }

  function buildSimilarMessage(product: Product): string {
    return [
      `¡Hola! Vi «${product.name}» en su catálogo y ya está vendido.`,
      '¿Tienen algo similar o les volverá a llegar?',
      productUrl(product),
    ].join('\n')
  }

  function openWhatsApp(product: Product, source: WhatsAppSource) {
    trackWhatsAppClick(source, product)
    const message = encodeURIComponent(buildProductMessage(product))
    const number = whatsappNumber.value.replace(/[^0-9]/g, '')
    const url = `https://wa.me/${number}?text=${message}`
    window.open(url, '_blank')
  }

  /** Pieza vendida: pedir algo parecido (demanda para reponer). */
  function openWhatsAppSimilar(product: Product) {
    trackAskSimilar(product)
    const number = whatsappNumber.value.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(buildSimilarMessage(product))}`, '_blank')
  }

  function openWhatsAppGeneral(source: WhatsAppSource, message?: string) {
    trackWhatsAppClick(source)
    const number = whatsappNumber.value.replace(/[^0-9]/g, '')
    const text = encodeURIComponent(message || `Hola! Estoy viendo su catálogo en línea.`)
    const url = `https://wa.me/${number}?text=${text}`
    window.open(url, '_blank')
  }

  return {
    whatsappNumber,
    buildProductMessage,
    openWhatsApp,
    openWhatsAppSimilar,
    openWhatsAppGeneral,
  }
}
