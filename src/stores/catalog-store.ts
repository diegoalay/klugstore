import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product, Category } from 'src/types'

export const useCatalogStore = defineStore('catalog', () => {
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const activeCategory = ref<string | null>(null)
  const searchQuery = ref('')

  const sortedCategories = computed(() =>
    [...categories.value].sort((a, b) => a.order - b.order),
  )

  const filteredProducts = computed(() => {
    let result = [...products.value]

    if (activeCategory.value) {
      result = result.filter((p) => p.categoryId === activeCategory.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))),
      )
    }

    return result.sort((a, b) => a.order - b.order)
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

  function getProductBySlug(slug: string): Product | undefined {
    return products.value.find((p) => p.slug === slug)
  }

  function getCategoryBySlug(slug: string): Category | undefined {
    return categories.value.find((c) => c.slug === slug)
  }

  function getProductsByCategory(categoryId: string): Product[] {
    return products.value.filter((p) => p.categoryId === categoryId && p.available)
  }

  return {
    products,
    categories,
    loading,
    activeCategory,
    searchQuery,
    sortedCategories,
    filteredProducts,
    featuredProducts,
    availableProducts,
    setProducts,
    setCategories,
    setActiveCategory,
    setSearchQuery,
    getProductBySlug,
    getCategoryBySlug,
    getProductsByCategory,
  }
})
