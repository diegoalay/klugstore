import { computed } from 'vue'
import { useStoreConfigStore } from 'src/stores'
import type { Product } from 'src/types'

export function useWhatsApp() {
  const storeConfig = useStoreConfigStore()

  const whatsappNumber = computed(() => storeConfig.whatsappNumber)

  function buildProductMessage(product: Product): string {
    const price = new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: product.currency || storeConfig.currency,
    }).format(product.price)

    return `Hola! Me interesa el producto:\n\n*${product.name}*\nPrecio: ${price}\n\nQuisiera más información.`
  }

  function openWhatsApp(product: Product) {
    const message = encodeURIComponent(buildProductMessage(product))
    const number = whatsappNumber.value.replace(/[^0-9]/g, '')
    const url = `https://wa.me/${number}?text=${message}`
    window.open(url, '_blank')
  }

  function openWhatsAppGeneral(message?: string) {
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
