<template>
  <q-page class="catalog-home">
    <StoreHeader />
    <CategoryNav />


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
      <ProductGrid :products="filteredProducts" :title="sectionTitle" show-count>
        <template #actions>
          <CatalogSortSelect
            :model-value="catalogSort"
            :options="CATALOG_SORT_OPTIONS"
            @update:model-value="catalogStore.setCatalogSort"
          />
        </template>
      </ProductGrid>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCatalogStore, useStoreConfigStore } from '@/stores'
import { useCatalogHomeHash } from '@/composables/useCatalogHash'
import { CATALOG_SORT_OPTIONS } from '@/utils/catalogSort'
import { usePageSeo, truncateSeoDescription } from '@/composables/usePageSeo'
import StoreHeader from '../components/StoreHeader.vue'
import CategoryNav from '../components/CategoryNav.vue'
import CatalogSortSelect from '../components/CatalogSortSelect.vue'
import ProductGrid from '../components/ProductGrid.vue'

const catalogStore = useCatalogStore()
const { catalogSort } = storeToRefs(catalogStore)
const storeConfig = useStoreConfigStore()
useCatalogHomeHash()

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
</style>
