<template>
  <q-page class="catalog-home">
    <StoreHeader />
    <CategoryNav />

    <div class="catalog-sort-row">
      <CatalogSortSelect
        :model-value="catalogSort"
        :options="CATALOG_SORT_OPTIONS"
        @update:model-value="catalogStore.setCatalogSort"
      />
      <button
        type="button"
        class="refresh-btn"
        :class="{ 'refresh-btn--spinning': refreshing }"
        aria-label="Actualizar catálogo"
        :disabled="refreshing"
        @click="handleRefresh"
      >
        <q-icon name="fa-solid fa-arrows-rotate" size="xs" />
      </button>
    </div>

    <!-- Featured section (only when no category filter) -->
    <section v-if="!activeCategory && featuredProducts.length" class="section-featured">
      <ProductGrid
        :products="featuredProducts"
        title="Destacados"
        subtitle="Los favoritos de nuestros clientes"
      />
    </section>

    <!-- All / filtered products -->
    <section class="section-products">
      <ProductGrid
        :products="filteredProducts"
        :title="sectionTitle"
      />
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCatalogStore, useStoreConfigStore } from 'src/stores'
import { useCatalog } from 'src/composables/useCatalog'
import { useCatalogHomeHash } from 'src/composables/useCatalogHash'
import { CATALOG_SORT_OPTIONS } from 'src/utils/catalogSort'
import { usePageSeo, truncateSeoDescription } from 'src/composables/usePageSeo'
import StoreHeader from '../components/StoreHeader.vue'
import CategoryNav from '../components/CategoryNav.vue'
import CatalogSortSelect from '../components/CatalogSortSelect.vue'
import ProductGrid from '../components/ProductGrid.vue'

const catalogStore = useCatalogStore()
const { catalogSort } = storeToRefs(catalogStore)
const storeConfig = useStoreConfigStore()
const { reloadCatalog } = useCatalog()
useCatalogHomeHash()

const refreshing = ref(false)

async function handleRefresh() {
  refreshing.value = true
  try {
    await reloadCatalog()
  } finally {
    refreshing.value = false
  }
}

const seoTitle = computed(() => `Catálogo | ${storeConfig.seoTitleSuffix}`)
const seoDescription = computed(() => {
  const base =
    storeConfig.config?.description ??
    'Decoración para el hogar, regalos y temporadas. Compra por WhatsApp en Guatemala.'
  return truncateSeoDescription(`${base} SweetHome GT.`)
})

usePageSeo({
  title: seoTitle,
  description: seoDescription,
  path: '/catalog',
})

const activeCategory = computed(() => catalogStore.activeCategory)
const filteredProducts = computed(() => catalogStore.filteredProducts)
const featuredProducts = computed(() => catalogStore.featuredProducts)

const sectionTitle = computed(() => {
  if (activeCategory.value) {
    const cat = catalogStore.categories.find((c) => c.id === activeCategory.value)
    return cat?.name ?? 'Productos'
  }
  return 'Todos los productos'
})
</script>

<style lang="scss" scoped>
.catalog-home {
  background: var(--ks-bg, #faf8f5);
  padding-bottom: 40px;
}

.section-featured {
  margin-bottom: 32px;
}

.section-products {
  margin-bottom: 24px;
}

.catalog-sort-row {
  max-width: 960px;
  margin: 0 auto 20px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--ks-secondary, #d19793);
  background: rgba(209, 151, 147, 0.1);
  color: var(--ks-secondary, #d19793);
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.15s ease;
  flex-shrink: 0;
  margin-top: 20px;

  &:hover {
    background: rgba(209, 151, 147, 0.2);
  }

  &:active {
    transform: scale(0.93);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &--spinning :deep(.q-icon) {
    animation: spin 0.7s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .catalog-sort-row {
    padding: 0 16px;
    margin-bottom: 16px;
  }
}
</style>
