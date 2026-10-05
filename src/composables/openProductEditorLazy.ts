/**
 * Abre el editor de producto desde el catálogo público sin incluir el código del admin
 * (store de Firestore, Storage, formularios) en el bundle que ven los clientes: el
 * composable se importa recién cuando un admin toca "Editar".
 */
export async function openProductEditorLazy(productId: string): Promise<void> {
  const { useAdminProductEditor } = await import('@/composables/useAdminProductEditor')
  await useAdminProductEditor().openProductEditor(productId)
}
