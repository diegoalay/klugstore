import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product, Category } from 'src/types'
import {
  applyCatalogSortMode,
  type CatalogSortMode,
} from 'src/utils/catalogSort'
import { normalizeForSearch } from 'src/utils/slugify'

export type { CatalogSortMode } from 'src/utils/catalogSort'

export const useCatalogStore = defineStore('catalog', () => {
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const activeCategory = ref<string | null>(null)
  const searchQuery = ref('')
  const catalogSort = ref<CatalogSortMode>('name-asc')

  const sortedCategories = computed(() =>
    [...categories.value].sort((a, b) => a.order - b.order),
  )

  const filteredProducts = computed(() => {
    let result = [...products.value]

    if (activeCategory.value) {
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

    return applyCatalogSortMode(result, catalogSort.value)
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
    return applyCatalogSortMode(getProductsByCategory(categoryId), catalogSort.value)
  }

  return {
    products,
    categories,
    loading,
    activeCategory,
    searchQuery,
    catalogSort,
    sortedCategories,
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
