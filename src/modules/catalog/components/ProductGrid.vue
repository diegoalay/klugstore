<template>
  <div class="product-grid-wrapper">
    <div v-if="title || $slots.actions" class="grid-header">
      <div class="grid-heading">
        <h2 v-if="title" class="grid-title">
          {{ title }}
          <span v-if="showCount" class="grid-count">{{ products.length }}</span>
        </h2>
        <p v-else-if="showCount" class="grid-count-text">
          {{ products.length }} {{ products.length === 1 ? 'producto' : 'productos' }}
        </p>
        <p v-if="subtitle" class="grid-subtitle">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
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
import type { Product } from '@/types'
import ProductCard from './ProductCard.vue'

defineProps<{
  products: Product[]
  title?: string
  subtitle?: string
  showCount?: boolean
}>()
</script>

<style lang="scss" scoped>
.product-grid-wrapper {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
}

.grid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.grid-heading {
  min-width: 0;
}

.grid-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ks-text, #1a1a2e);
  margin: 0;
}

.grid-count {
  align-self: center;
  line-height: 18px;
  height: 22px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ks-secondary, #d19793) 14%, transparent);
  color: var(--ks-secondary, #d19793);
}

.grid-count-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ks-text-secondary, #6b7280);
  margin: 0;
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
