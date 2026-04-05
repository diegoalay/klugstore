<template>
  <div class="product-grid-wrapper">
    <div v-if="title" class="grid-header">
      <h2 class="grid-title">{{ title }}</h2>
      <p v-if="subtitle" class="grid-subtitle">{{ subtitle }}</p>
    </div>

    <div v-if="products.length" class="product-grid">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
      />
    </div>

    <div v-else class="empty-state">
      <q-icon name="fa-solid fa-box-open" size="48px" color="grey-5" />
      <p class="empty-text">No se encontraron productos</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Product } from 'src/types'
import ProductCard from './ProductCard.vue'

defineProps<{
  products: Product[]
  title?: string
  subtitle?: string
}>()
</script>

<style lang="scss" scoped>
.product-grid-wrapper {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
}

.grid-header {
  margin-bottom: 16px;
}

.grid-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ks-text, #1a1a2e);
  margin: 0 0 4px;
}

.grid-subtitle {
  font-size: 0.85rem;
  color: var(--ks-text-secondary, #6b7280);
  margin: 0;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
}

.empty-text {
  color: var(--ks-text-secondary, #6b7280);
  font-size: 0.9rem;
}

@media (min-width: 600px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .product-grid-wrapper {
    padding: 0 16px;
  }

  .product-grid {
    gap: 12px;
  }
}
</style>
