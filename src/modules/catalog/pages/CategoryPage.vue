<template>
  <q-page class="catalog-category">
    <div class="category-header-section">
      <h1 class="category-title">{{ category?.name ?? 'Categoría' }}</h1>
      <p v-if="category?.description" class="category-description">{{ category.description }}</p>
    </div>

    <ProductGrid :products="products" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalogStore, useStoreConfigStore } from 'src/stores'
import { usePageSeo, truncateSeoDescription } from 'src/composables/usePageSeo'
import ProductGrid from '../components/ProductGrid.vue'

const route = useRoute()
const catalogStore = useCatalogStore()
const storeConfig = useStoreConfigStore()

const category = computed(() => {
  const slug = route.params.categorySlug as string
  return catalogStore.getCategoryBySlug(slug)
})

const products = computed(() => {
  if (!category.value) return []
  return catalogStore.getProductsByCategory(category.value.id)
})

const categoryPath = computed(() => `/catalog/categoria/${route.params.categorySlug as string}`)

const seoTitle = computed(() => {
  if (!category.value) return `Categoría — ${storeConfig.storeName}`
  return `${category.value.name} — Decoración hogar | ${storeConfig.storeName}`
})

const seoDescription = computed(() => {
  if (!category.value) {
    return truncateSeoDescription(
      `Explora categorías de decoración y hogar en ${storeConfig.storeName}, Guatemala.`,
    )
  }
  const extra =
    category.value.description ??
    `Piezas de ${category.value.name} para tu hogar. Envíos y compra por WhatsApp en Guatemala.`
  return truncateSeoDescription(extra)
})

usePageSeo({
  title: seoTitle,
  description: seoDescription,
  path: categoryPath,
})

watch(
  () => route.params.categorySlug,
  () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },
)
</script>

<style lang="scss" scoped>
.catalog-category {
  background: var(--ks-bg, #faf8f5);
  padding-bottom: 40px;
}

.category-header-section {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 20px 20px;
}

.category-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--ks-text, #1a1a2e);
  margin: 0 0 8px;
}

.category-description {
  font-size: 0.9rem;
  color: var(--ks-text-secondary, #6b7280);
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .category-header-section {
    padding: 16px 16px 16px;
  }

  .category-title {
    font-size: 1.3rem;
  }
}
</style>
