import { computed } from 'vue'
import { useStoreConfigStore } from '@/stores'
import type { Product } from '@/types'
import { formatCurrency } from '@/utils/format'
import { trackWhatsAppClick, type WhatsAppSource } from '@/utils/analytics'

export function useWhatsApp() {
  const storeConfig = useStoreConfigStore()

  const whatsappNumber = computed(() => storeConfig.whatsappNumber)

  function buildProductMessage(product: Product): string {
    const price = formatCurrency(product.price, product.currency || storeConfig.currency)

    const productUrl = `${window.location.origin}/catalog/producto/${product.slug}`

    return `Hola! Me interesa el producto:\n\n*${product.name}*\nPrecio: ${price}\n${productUrl}\n\nQuisiera más información.`
  }

  function openWhatsApp(product: Product, source: WhatsAppSource) {
    trackWhatsAppClick(source, product)
    const message = encodeURIComponent(buildProductMessage(product))
    const number = whatsappNumber.value.replace(/[^0-9]/g, '')
    const url = `https://wa.me/${number}?text=${message}`
    window.open(url, '_blank')
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
    openWhatsAppGeneral,
  }
}
