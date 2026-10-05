import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product, Category } from '@/types'
import {
  applyCatalogSortMode,
  type CatalogSortMode,
} from '@/utils/catalogSort'
import { normalizeForSearch } from '@/utils/slugify'

export type { CatalogSortMode } from '@/utils/catalogSort'

/** Pseudo-categoría de la barra: piezas vendidas (prueba social). */
export const SOLD_CATEGORY_ID = 'sold'

export const useCatalogStore = defineStore('catalog', () => {
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const activeCategory = ref<string | null>(null)
  const searchQuery = ref('')
  const catalogSort = ref<CatalogSortMode>('default')

  const sortedCategories = computed(() =>
    [...categories.value].sort((a, b) => a.order - b.order),
  )

  /** Posición de cada categoría (orden del admin), para ordenar productos por categoría. */
  const categoryOrder = computed(() => new Map(categories.value.map((c) => [c.id, c.order])))

  const categoriesWithStock = computed(() => {
    const used = new Set(products.value.filter((p) => p.available).map((p) => p.categoryId))
    return sortedCategories.value.filter((c) => used.has(c.id))
  })

  const soldProducts = computed(() => products.value.filter((p) => p.sold))

  // Los vendidos no se mezclan con lo disponible: tienen su propia pestaña
  // ("Vendidos") y su ficha sigue accesible por link directo.
  const filteredProducts = computed(() => {
    const showingSold = activeCategory.value === SOLD_CATEGORY_ID
    let result = showingSold ? [...soldProducts.value] : products.value.filter((p) => p.available)

    if (activeCategory.value && !showingSold) {
      result = result.filter((p) => p.categoryId === activeCategory.value)
    }

    if (searchQuery.value.trim()) {
      // Búsqueda case-insensitive y diacritic-insensitive:
      //   "cancion" encuentra "Canción", "canción", "CANCIÓN"
      //   "nino"    encuentra "niño"
      const q = normalizeForSearch(searchQuery.value)
      result = result.filter((p) => {
        const haystack = normalizeForSearch(
          [p.name, p.description, ...(p.tags ?? [])].join(' '),
        )
        return haystack.includes(q)
      })
    }

    return applyCatalogSortMode(result, catalogSort.value, categoryOrder.value)
  })

  const featuredProducts = computed(() => products.value.filter((p) => p.featured && p.available))

  const availableProducts = computed(() => products.value.filter((p) => p.available))

  function setProducts(items: Product[]) {
    products.value = items
  }

  function setCategories(items: Category[]) {
    categories.value = items
  }

  function setActiveCategory(categoryId: string | null) {
    activeCategory.value = categoryId
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function setCatalogSort(mode: CatalogSortMode) {
    catalogSort.value = mode
  }

  function getProductBySlug(slug: string): Product | undefined {
    return products.value.find((p) => p.slug === slug)
  }

  function getCategoryBySlug(slug: string): Category | undefined {
    return categories.value.find((c) => c.slug === slug)
  }

  function getProductsByCategory(categoryId: string): Product[] {
    return products.value.filter((p) => p.categoryId === categoryId && p.available)
  }

  function getSortedProductsByCategory(categoryId: string): Product[] {
    return applyCatalogSortMode(getProductsByCategory(categoryId), catalogSort.value, categoryOrder.value)
  }

  return {
    products,
    categories,
    loading,
    activeCategory,
    searchQuery,
    catalogSort,
    sortedCategories,
    categoryOrder,
    categoriesWithStock,
    soldProducts,
    filteredProducts,
    featuredProducts,
    availableProducts,
    setProducts,
    setCategories,
    setActiveCategory,
    setSearchQuery,
    setCatalogSort,
    getSortedProductsByCategory,
    getProductBySlug,
    getCategoryBySlug,
    getProductsByCategory,
  }
})
