<template>
  <ProductFormDialog
    v-model="editorOpen"
    :product="editorProduct"
    :prefill="editorPrefill"
    @saved="onSaved"
    @request-delete="onRequestDelete"
  />
</template>

<script setup lang="ts">
/**
 * Diálogo de edición de producto montado en el catálogo público (solo para admins).
 * Vive en su propio chunk: CatalogLayout lo carga con defineAsyncComponent cuando hay
 * sesión de admin, así el store de Firestore y el formulario no entran en el bundle público.
 */
import ProductFormDialog from '@/components/admin/ProductFormDialog.vue'
import { useAdminProductEditor } from '@/composables/useAdminProductEditor'

const emit = defineEmits<{ changed: [] }>()

const { editorOpen, editorProduct, editorPrefill, handleEditorSaved, confirmDeleteProduct } =
  useAdminProductEditor()

async function onSaved(productId?: string) {
  if (productId) await handleEditorSaved(productId)
  emit('changed')
}

function onRequestDelete() {
  const p = editorProduct.value
  if (!p) return
  editorOpen.value = false
  confirmDeleteProduct(p, () => emit('changed'))
}
</script>
