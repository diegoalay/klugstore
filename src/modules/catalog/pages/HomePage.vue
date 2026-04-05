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
      <ProductGrid
        :products="filteredProducts"
        :title="sectionTitle"
      />
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCatalogStore } from 'src/stores'
import { useCatalogHomeHash } from 'src/composables/useCatalogHash'
import StoreHeader from '../components/StoreHeader.vue'
import CategoryNav from '../components/CategoryNav.vue'
import ProductGrid from '../components/ProductGrid.vue'

const catalogStore = useCatalogStore()
useCatalogHomeHash()

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
