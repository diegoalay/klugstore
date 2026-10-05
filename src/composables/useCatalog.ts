import { useCatalogStore, useStoreConfigStore } from '@/stores'
import { loadCatalogFromSource } from '@/mocks/catalog.mock'
import { clearRemoteCatalogCache } from '@/utils/catalogData'
import { clearSheetsCache } from '@/utils/googleSheetsAdapter'

export function useCatalog() {
  const catalogStore = useCatalogStore()
  const storeConfigStore = useStoreConfigStore()

  async function loadCatalog(storeSlug?: string): Promise<void> {
    catalogStore.loading = true
    storeConfigStore.loading = true

    try {
      // loadCatalogFromSource: Sheets (si .env) → JSON remoto → empaquetado.
      const data = await loadCatalogFromSource(storeSlug)
      storeConfigStore.setConfig(data.store)
      catalogStore.setCategories(data.categories)
      catalogStore.setProducts(data.products)
    } finally {
      catalogStore.loading = false
      storeConfigStore.loading = false
    }
  }

  /**
   * Fuerza re-fetch del catálogo limpiando TODOS los caches en memoria (Sheets,
   * JSON remoto). Útil cuando el editor acaba de guardar cambios y quiere
   * verlos reflejados sin esperar el TTL natural del cache.
   */
  async function reloadCatalog(storeSlug?: string): Promise<void> {
    clearSheetsCache()
    clearRemoteCatalogCache(storeSlug)
    await loadCatalog(storeSlug)
  }

  return {
    loadCatalog,
    reloadCatalog,
  }
}
