<template>
  <q-page class="catalog-category">
    <div class="category-header-section">
      <h1 class="category-title">{{ category?.name ?? 'Categoría' }}</h1>
      <p v-if="category?.description" class="category-description">{{ category.description }}</p>
    </div>

    <div class="category-sort-row">
      <CatalogSortSelect
        :model-value="catalogSort"
        :options="CATALOG_SORT_OPTIONS"
        @update:model-value="catalogStore.setCatalogSort"
      />
    </div>

    <ProductGrid :products="products" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useCatalogStore, useStoreConfigStore } from 'src/stores'
import { CATALOG_SORT_OPTIONS } from 'src/utils/catalogSort'
import { usePageSeo, truncateSeoDescription } from 'src/composables/usePageSeo'
import CatalogSortSelect from '../components/CatalogSortSelect.vue'
import ProductGrid from '../components/ProductGrid.vue'

const route = useRoute()
const catalogStore = useCatalogStore()
const { catalogSort } = storeToRefs(catalogStore)
const storeConfig = useStoreConfigStore()

const category = computed(() => {
  const slug = route.params.categorySlug as string
  return catalogStore.getCategoryBySlug(slug)
})

const products = computed(() => {
  if (!category.value) return []
  return catalogStore.getSortedProductsByCategory(category.value.id)
})

const categoryPath = computed(() => `/catalog/categoria/${route.params.categorySlug as string}`)

const seoTitle = computed(() => {
  if (!category.value) return `Categoría | ${storeConfig.seoTitleSuffix}`
  return `${category.value.name} | ${storeConfig.seoTitleSuffix}`
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

.category-sort-row {
  max-width: 960px;
  margin: 0 auto 20px;
  padding: 0 20px;
}

@media (max-width: 768px) {
  .category-header-section {
    padding: 16px 16px 16px;
  }

  .category-title {
    font-size: 1.3rem;
  }

  .category-sort-row {
    padding: 0 16px;
  }
}
</style>
