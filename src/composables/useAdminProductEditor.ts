import { ref, shallowRef } from 'vue'
import { Dialog, Loading, Notify } from 'quasar'
import type { Product } from '@/types'
import { useAdminFirestoreCatalogStore } from '@/stores/admin-firestore-catalog-store'

// Estado compartido: un solo editor para toda la app (catálogo público y admin).
const editorOpen = ref(false)
const editorProduct = shallowRef<Product | null>(null)
const editorLoading = ref(false)

/**
 * Abre el diálogo de edición de producto. Desde el catálogo público el
 * producto llega con la forma del catálogo; se edita siempre la versión del
 * store admin (Firestore), cargándolo la primera vez.
 */
export function useAdminProductEditor() {
  const store = useAdminFirestoreCatalogStore()

  async function openProductEditor(productId: string | null) {
    if (productId === null) {
      editorProduct.value = null
      editorOpen.value = true
      return
    }
    if (!store.sourceReady) {
      editorLoading.value = true
      Loading.show({ message: 'Abriendo editor…' })
      try {
        await store.load()
      } finally {
        editorLoading.value = false
        Loading.hide()
      }
    }
    const product = store.products.find((p) => p.id === productId)
    if (!product) {
      Notify.create({ type: 'warning', message: 'No se encontró el producto para editar' })
      return
    }
    editorProduct.value = product
    editorOpen.value = true
  }

  /** Confirma y borra; `onDeleted` refresca la vista que lo llamó. */
  function confirmDeleteProduct(product: Product, onDeleted?: () => void | Promise<void>) {
    Dialog.create({
      title: 'Eliminar producto',
      message: `¿Eliminar «${product.name}» de forma permanente?`,
      cancel: { label: 'Cancelar', flat: true, noCaps: true },
      ok: { label: 'Eliminar', color: 'negative', unelevated: true, noCaps: true },
      persistent: true,
    }).onOk(() => {
      void (async () => {
        try {
          await store.deleteProduct(product.id)
          Notify.create({ type: 'info', message: 'Producto eliminado' })
          await onDeleted?.()
        } catch (err) {
          console.error(err)
          Notify.create({ type: 'negative', message: 'No se pudo eliminar' })
        }
      })()
    })
  }

  return { editorOpen, editorProduct, editorLoading, openProductEditor, confirmDeleteProduct }
}
