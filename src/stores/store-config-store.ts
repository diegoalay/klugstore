import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StoreConfig, StoreTheme } from 'src/types'
import { resolveStoreSlug } from 'src/utils/storeResolver'

export const useStoreConfigStore = defineStore('storeConfig', () => {
  const config = ref<StoreConfig | null>(null)
  const loading = ref(false)

  const storeName = computed(() => config.value?.name ?? 'KlugStore')

  /** Slug de tienda (p. ej. `sweethome`); antes de cargar config se infiere del host. */
  const storeSlug = computed(() => config.value?.slug ?? resolveStoreSlug())

  /** Sufijo de `<title>` tipo `Catálogo | SWEETHOME`. */
  const seoTitleSuffix = computed(() => storeSlug.value.toUpperCase())
  const logo = computed(() => config.value?.logo ?? '')
  const theme = computed<StoreTheme | null>(() => config.value?.theme ?? null)
  const whatsappNumber = computed(() => config.value?.whatsappNumber ?? '')
  const currency = computed(() => config.value?.currency ?? 'GTQ')
  const socialLinks = computed(() => config.value?.socialLinks ?? {})

  function setConfig(storeConfig: StoreConfig) {
    config.value = storeConfig
    applyTheme(storeConfig.theme)
  }

  function applyTheme(t: StoreTheme) {
    const root = document.documentElement
    root.style.setProperty('--ks-primary', t.primaryColor)
    root.style.setProperty('--ks-secondary', t.secondaryColor)
    root.style.setProperty('--ks-accent', t.accentColor)
    root.style.setProperty('--ks-bg', t.backgroundColor)
    root.style.setProperty('--ks-surface', t.surfaceColor)
    root.style.setProperty('--ks-text', t.textColor)
    root.style.setProperty('--ks-text-secondary', t.textSecondaryColor)
    root.style.setProperty('--ks-radius', `${t.borderRadius}px`)
  }

  function resetConfig() {
    config.value = null
  }

  return {
    config,
    loading,
    storeName,
    storeSlug,
    seoTitleSuffix,
    logo,
    theme,
    whatsappNumber,
    currency,
    socialLinks,
    setConfig,
    resetConfig,
  }
})
