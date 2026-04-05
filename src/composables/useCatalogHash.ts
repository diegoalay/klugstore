import { watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCatalogStore } from 'src/stores'
import { parseCatalogSortParam, type CatalogSortMode } from 'src/utils/catalogSort'

/** Guarda el hash actual (#cat=&q=&sort=) antes de abrir un producto para poder restaurarlo al volver. */
export const CATALOG_RETURN_HASH_KEY = 'ks-catalog-return-hash'

export function stashCatalogHashBeforeProductNavigation() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(CATALOG_RETURN_HASH_KEY, window.location.hash || '')
}

function restoreCatalogHashFromStashIfNeeded(routeName: string | symbol | undefined | null) {
  if (routeName !== 'catalog-home' || typeof window === 'undefined') return
  if (window.location.hash) {
    sessionStorage.removeItem(CATALOG_RETURN_HASH_KEY)
    return
  }
  const saved = sessionStorage.getItem(CATALOG_RETURN_HASH_KEY)
  if (saved) {
    sessionStorage.removeItem(CATALOG_RETURN_HASH_KEY)
    const base = `${window.location.pathname}${window.location.search}`
    window.history.replaceState(window.history.state, '', base + saved)
  }
}

/** Lee estado del catálogo desde el hash: #cat=&q=&sort= */
export function parseCatalogHash(): { cat: string | null; q: string; sort: CatalogSortMode } {
  const raw = window.location.hash.replace(/^#/, '').trim()
  if (!raw) return { cat: null, q: '', sort: 'default' }
  const sp = new URLSearchParams(raw)
  return {
    cat: sp.get('cat'),
    q: sp.get('q') ?? '',
    sort: parseCatalogSortParam(sp.get('sort')),
  }
}

export function buildCatalogHash(
  cat: string | null,
  q: string,
  sort: CatalogSortMode = 'default',
): string {
  const sp = new URLSearchParams()
  if (cat) sp.set('cat', cat)
  const qt = q.trim()
  if (qt) sp.set('q', qt)
  if (sort !== 'default') sp.set('sort', sort)
  const s = sp.toString()
  return s ? `#${s}` : ''
}

function replaceCatalogUrlHash(cat: string | null, q: string, sort: CatalogSortMode) {
  const next = buildCatalogHash(cat, q, sort)
  const base = `${window.location.pathname}${window.location.search}`
  const current = window.location.hash || ''
  if (current === next) return
  window.history.replaceState(null, '', base + next)
}

/** Aplica hash actual al store (slug → categoryId, sort, búsqueda). */
export function applyCatalogHashToStore() {
  const catalog = useCatalogStore()
  const { cat, q, sort } = parseCatalogHash()
  if (cat) {
    const category = catalog.getCategoryBySlug(cat)
    catalog.setActiveCategory(category?.id ?? null)
  } else {
    catalog.setActiveCategory(null)
  }
  catalog.setSearchQuery(q)
  catalog.setCatalogSort(sort)
}

/**
 * Sincroniza categoría + búsqueda del home con la URL (#cat=&q=).
 * Permite recargar o compartir enlace con filtro y búsqueda.
 */
export function useCatalogHomeHash() {
  const route = useRoute()
  const catalog = useCatalogStore()
  const { activeCategory, searchQuery, catalogSort } = storeToRefs(catalog)

  function slugFromActiveCategory(): string | null {
    if (!activeCategory.value) return null
    const c = catalog.categories.find((x) => x.id === activeCategory.value)
    return c?.slug ?? null
  }

  function syncHashFromStore() {
    if (route.name !== 'catalog-home') return
    replaceCatalogUrlHash(slugFromActiveCategory(), searchQuery.value, catalogSort.value)
  }

  function onHashChange() {
    if (route.name !== 'catalog-home') return
    applyCatalogHashToStore()
  }

  onMounted(() => {
    if (route.name === 'catalog-home') {
      restoreCatalogHashFromStashIfNeeded(route.name)
      applyCatalogHashToStore()
      syncHashFromStore()
    }
    window.addEventListener('hashchange', onHashChange)
  })

  onUnmounted(() => {
    window.removeEventListener('hashchange', onHashChange)
  })

  watch(
    () => route.name,
    (name) => {
      if (name === 'catalog-home') {
        restoreCatalogHashFromStashIfNeeded(name)
        applyCatalogHashToStore()
        syncHashFromStore()
      }
    },
  )

  watch([activeCategory, searchQuery, catalogSort, () => route.name], () => syncHashFromStore(), {
    flush: 'post',
  })
}
