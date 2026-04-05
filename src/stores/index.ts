import { defineStore } from '#q-app/wrappers'
import { createPinia } from 'pinia'

export default defineStore((/* { ssrContext } */) => {
  const pinia = createPinia()
  return pinia
})

// Re-export stores for convenient imports elsewhere
export { useCatalogStore } from './catalog-store'
export { useStoreConfigStore } from './store-config-store'
