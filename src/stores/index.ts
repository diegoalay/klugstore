import { defineStore } from '#q-app'
import { createPinia } from 'pinia'

export default defineStore((/* { ssrContext } */) => {
  const pinia = createPinia()
  return pinia
})

// Re-export stores for convenient imports elsewhere
export { useCatalogStore } from './catalog-store'
export { useStoreConfigStore } from './store-config-store'
export { useAdminFirestoreCatalogStore } from './admin-firestore-catalog-store'
