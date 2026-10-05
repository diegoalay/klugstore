import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StoreConfig, StoreTheme } from '@/types'
import { resolveStoreSlug } from '@/utils/storeResolver'

export const useStoreConfigStore = defineStore('storeConfig', () => {
  const config = ref<StoreConfig | null>(null)
  const loading = ref(false)

  /**
   * Antes de que cargue la config real (Firestore/Sheets), no hay que
   * mostrar un nombre de marca genérico/equivocado — se usa el slug de la
   * tienda resuelto por hostname (ya funciona sin esperar red) en vez de un
   * nombre fijo tipo "KlugStore", que no tiene nada que ver con la tienda
   * real y se alcanzaba a ver en cada recarga.
   */
  const storeName = computed(() => config.value?.name ?? capitalize(resolveStoreSlug()))

  function capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
  }

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
    // No-op en SSR: no hay `document` en Node. El cliente aplica el tema al
    // hidratar (este mismo store se vuelve a poblar con `onMounted` si hace
    // falta, o ya llega con el estado serializado del servidor).
    if (typeof document === 'undefined') return
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
