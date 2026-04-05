import { shallowRef } from 'vue'
import type { Product } from 'src/types'

const quickViewProduct = shallowRef<Product | null>(null)

export function useProductQuickView() {
  function openProductQuickView(product: Product) {
    quickViewProduct.value = product
  }

  function closeProductQuickView() {
    quickViewProduct.value = null
  }

  return {
    quickViewProduct,
    openProductQuickView,
    closeProductQuickView,
  }
}
