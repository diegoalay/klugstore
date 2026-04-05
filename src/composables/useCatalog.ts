import { useCatalogStore, useStoreConfigStore } from 'src/stores'
import { getMockCatalog } from 'src/mocks/catalog.mock'
import type { CatalogData } from 'src/types'

export function useCatalog() {
  const catalogStore = useCatalogStore()
  const storeConfigStore = useStoreConfigStore()

  async function loadCatalog(storeSlug?: string): Promise<void> {
    catalogStore.loading = true
    storeConfigStore.loading = true

    try {
      // TODO: Replace with API call to klugsystem
      // const response = await api.get(`/stores/${storeSlug}/catalog`)
      // const data: CatalogData = response.data

      // Simulate async load for future API parity
      const data: CatalogData = await Promise.resolve(getMockCatalog(storeSlug))

      storeConfigStore.setConfig(data.store)
      catalogStore.setCategories(data.categories)
      catalogStore.setProducts(data.products)
    } finally {
      catalogStore.loading = false
      storeConfigStore.loading = false
    }
  }

  return {
    loadCatalog,
  }
}
