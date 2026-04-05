import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import type { Product } from 'src/types'
import { loadAllProductsFromResolvedSource } from 'src/mocks/catalog.mock'
import type { RawCatalog } from 'src/utils/catalogData'
import { resolveCatalogSlug, listCatalogSlugs, clearRemoteCatalogCache } from 'src/utils/catalogData'
import { clearSheetsCache } from 'src/utils/googleSheetsAdapter'
import {
  ADMIN_CATALOG_SORT_OPTIONS,
  applyAdminCatalogSort,
  type AdminCatalogSortMode,
} from 'src/utils/catalogSort'

function cloneProducts(list: Product[]): Product[] {
  return JSON.parse(JSON.stringify(list)) as Product[]
}

/**
 * Borrador del catálogo solo para sesión admin: se rellena tras login y se
 * destruye con `reset()` al cerrar sesión (no persiste en localStorage).
 */
export const useAdminCatalogDraftStore = defineStore('adminCatalogDraft', () => {
  const products = ref<Product[]>([])
  const tagInputs = ref<Record<string, string>>({})
  const imageUrlLines = ref<Record<string, string[]>>({})
  const baseProductsSnapshot = ref<Product[]>([])
  const lastResolvedRaw = ref<RawCatalog | null>(null)
  const loadingDraft = ref(false)
  const sourceReady = ref(false)
  const filter = ref('')
  const sortMode = ref<AdminCatalogSortMode>('default')

  const catalogSlug = computed(() => resolveCatalogSlug())
  const catalogSlugsLabel = computed(() => listCatalogSlugs().join(', ') || '—')

  const categorySelectOptions = computed(() =>
    (lastResolvedRaw.value?.categories ?? []).map((c) => ({
      value: c.slug,
      label: c.name,
    })),
  )

  const filtered = computed(() => {
    const q = filter.value.trim().toLowerCase()
    const list = !q
      ? products.value
      : products.value.filter(
          (p) =>
            p.id.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            (p.categoryName && p.categoryName.toLowerCase().includes(q)),
        )
    return applyAdminCatalogSort(list, sortMode.value)
  })

  function applyDraftFromProducts(list: Product[]) {
    const ti: Record<string, string> = {}
    const ii: Record<string, string[]> = {}
    for (const p of list) {
      ti[p.id] = (p.tags ?? []).join(', ')
      const urls = (p.images ?? []).map((i) => i.url).filter(Boolean)
      ii[p.id] = urls.length ? urls : ['']
    }
    tagInputs.value = ti
    imageUrlLines.value = ii
  }

  function ensureImageLines(id: string): string[] {
    if (!imageUrlLines.value[id]) {
      imageUrlLines.value = { ...imageUrlLines.value, [id]: [''] }
    }
    return imageUrlLines.value[id]!
  }

  function setImageUrlLine(id: string, idx: number, v: string | number | null) {
    const lines = [...ensureImageLines(id)]
    lines[idx] = String(v ?? '')
    imageUrlLines.value = { ...imageUrlLines.value, [id]: lines }
  }

  function addImageUrlLine(id: string) {
    const lines = [...ensureImageLines(id), '']
    imageUrlLines.value = { ...imageUrlLines.value, [id]: lines }
  }

  function removeImageUrlLine(id: string, idx: number) {
    let lines = [...ensureImageLines(id)]
    lines.splice(idx, 1)
    if (lines.length === 0) lines = ['']
    imageUrlLines.value = { ...imageUrlLines.value, [id]: lines }
  }

  function previewImageUrls(p: Product): string[] {
    const lines = imageUrlLines.value[p.id]
    if (lines !== undefined) {
      return lines.map((s) => s.trim()).filter(Boolean)
    }
    return (p.images ?? []).map((i) => i.url)
  }

  function previewPrimaryUrl(p: Product): string | undefined {
    return previewImageUrls(p)[0]
  }

  function syncDraftInputsToProducts() {
    for (const p of products.value) {
      const t = tagInputs.value[p.id]
      if (t !== undefined) {
        p.tags = t.split(',').map((s) => s.trim()).filter(Boolean)
      }
      const lines = imageUrlLines.value[p.id]
      if (lines !== undefined) {
        const urls = lines.map((s) => s.trim()).filter(Boolean)
        p.images = urls.map((url, i) => ({
          url,
          alt: p.name,
          order: i + 1,
        }))
      }
    }
  }

  async function loadDraft() {
    loadingDraft.value = true
    sourceReady.value = false
    try {
      const { products: all, raw } = await loadAllProductsFromResolvedSource(catalogSlug.value)
      const draft = cloneProducts(all)
      baseProductsSnapshot.value = cloneProducts(all)
      lastResolvedRaw.value = raw
      products.value = draft
      applyDraftFromProducts(draft)
      sourceReady.value = true
    } catch (e) {
      console.error(e)
      baseProductsSnapshot.value = []
      lastResolvedRaw.value = null
      products.value = []
      tagInputs.value = {}
      imageUrlLines.value = {}
      Notify.create({ type: 'negative', message: 'No se pudo cargar el catálogo desde la fuente' })
    } finally {
      loadingDraft.value = false
    }
  }

  async function reloadFromSource() {
    clearSheetsCache()
    clearRemoteCatalogCache(catalogSlug.value)
    await loadDraft()
    if (sourceReady.value) {
      Notify.create({ type: 'positive', message: 'Catálogo recargado desde la fuente' })
    }
  }

  function appendDraftProduct(p: Product) {
    products.value = [...products.value, p]
    tagInputs.value = { ...tagInputs.value, [p.id]: '' }
    imageUrlLines.value = { ...imageUrlLines.value, [p.id]: [''] }
  }

  function removeDraftProduct(id: string) {
    products.value = products.value.filter((x) => x.id !== id)
    const restT = { ...tagInputs.value }
    delete restT[id]
    tagInputs.value = restT
    const restI = { ...imageUrlLines.value }
    delete restI[id]
    imageUrlLines.value = restI
  }

  /** Limpia todo el borrador admin (p. ej. al hacer logout). */
  function reset() {
    products.value = []
    tagInputs.value = {}
    imageUrlLines.value = {}
    baseProductsSnapshot.value = []
    lastResolvedRaw.value = null
    loadingDraft.value = false
    sourceReady.value = false
    filter.value = ''
    sortMode.value = 'default'
  }

  return {
    products,
    tagInputs,
    imageUrlLines,
    baseProductsSnapshot,
    lastResolvedRaw,
    loadingDraft,
    sourceReady,
    filter,
    sortMode,
    catalogSlug,
    catalogSlugsLabel,
    categorySelectOptions,
    filtered,
    ADMIN_CATALOG_SORT_OPTIONS,
    loadDraft,
    reloadFromSource,
    reset,
    syncDraftInputsToProducts,
    setImageUrlLine,
    addImageUrlLine,
    removeImageUrlLine,
    previewImageUrls,
    previewPrimaryUrl,
    appendDraftProduct,
    removeDraftProduct,
  }
})
