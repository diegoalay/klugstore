import { watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCatalogStore } from 'src/stores'

/** Lee estado del catálogo desde el hash: #cat=slug-categoria&q=texto-búsqueda */
export function parseCatalogHash(): { cat: string | null; q: string } {
  const raw = window.location.hash.replace(/^#/, '').trim()
  if (!raw) return { cat: null, q: '' }
  const sp = new URLSearchParams(raw)
  return {
    cat: sp.get('cat'),
    q: sp.get('q') ?? '',
  }
}

export function buildCatalogHash(cat: string | null, q: string): string {
  const sp = new URLSearchParams()
  if (cat) sp.set('cat', cat)
  const qt = q.trim()
  if (qt) sp.set('q', qt)
  const s = sp.toString()
  return s ? `#${s}` : ''
}

function replaceCatalogUrlHash(cat: string | null, q: string) {
  const next = buildCatalogHash(cat, q)
  const base = `${window.location.pathname}${window.location.search}`
  const current = window.location.hash || ''
  if (current === next) return
  window.history.replaceState(null, '', base + next)
}

/** Aplica hash actual al store (slug → categoryId). */
export function applyCatalogHashToStore() {
  const catalog = useCatalogStore()
  const { cat, q } = parseCatalogHash()
  if (cat) {
    const category = catalog.getCategoryBySlug(cat)
    catalog.setActiveCategory(category?.id ?? null)
  } else {
    catalog.setActiveCategory(null)
  }
  catalog.setSearchQuery(q)
}

/**
 * Sincroniza categoría + búsqueda del home con la URL (#cat=&q=).
 * Permite recargar o compartir enlace con filtro y búsqueda.
 */
export function useCatalogHomeHash() {
  const route = useRoute()
  const catalog = useCatalogStore()
  const { activeCategory, searchQuery } = storeToRefs(catalog)

  function slugFromActiveCategory(): string | null {
    if (!activeCategory.value) return null
    const c = catalog.categories.find((x) => x.id === activeCategory.value)
    return c?.slug ?? null
  }

  function syncHashFromStore() {
    if (route.name !== 'catalog-home') return
    replaceCatalogUrlHash(slugFromActiveCategory(), searchQuery.value)
  }

  function onHashChange() {
    if (route.name !== 'catalog-home') return
    applyCatalogHashToStore()
  }

  onMounted(() => {
    if (route.name === 'catalog-home') {
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
        applyCatalogHashToStore()
        syncHashFromStore()
      }
    },
  )

  watch([activeCategory, searchQuery, () => route.name], () => syncHashFromStore(), {
    flush: 'post',
  })
}
