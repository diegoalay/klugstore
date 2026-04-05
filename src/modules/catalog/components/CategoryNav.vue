<template>
  <div class="category-nav-wrapper">
    <div class="category-pill-track" role="tablist" aria-label="Categorías de productos">
      <q-btn
        :class="['category-chip', { 'category-chip--active': isTodosChipActive }]"
        flat
        no-caps
        unelevated
        padding="8px 16px"
        @click="selectCategory(null)"
      >
        Todos
      </q-btn>

      <q-btn
        v-for="category in categories"
        :key="category.id"
        :class="['category-chip', { 'category-chip--active': isCategoryChipActive(category.id) }]"
        flat
        no-caps
        unelevated
        padding="8px 14px"
        @click="selectCategory(category.id)"
      >
        <q-icon v-if="category.icon" :name="category.icon" size="14px" class="category-chip-icon" />
        {{ category.name }}
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from 'src/stores'

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()

const categories = computed(() => catalogStore.sortedCategories)

/** En `/catalog` el estado viene del store (y hash); en `/catalog/categoria/:slug` de la ruta. */
const isTodosChipActive = computed(() => {
  if (route.name === 'catalog-category') return false
  return !catalogStore.activeCategory
})

function isCategoryChipActive(categoryId: string): boolean {
  if (route.name === 'catalog-category') {
    return (route.params.categorySlug as string) === categoryId
  }
  return catalogStore.activeCategory === categoryId
}

function selectCategory(categoryId: string | null) {
  if (route.name === 'catalog-category') {
    if (categoryId === null) {
      void router.push({ name: 'catalog-home' })
      catalogStore.setActiveCategory(null)
      return
    }
    if ((route.params.categorySlug as string) !== categoryId) {
      void router.push({ name: 'catalog-category', params: { categorySlug: categoryId } })
    }
    catalogStore.setActiveCategory(categoryId)
    return
  }
  catalogStore.setActiveCategory(categoryId)
}
</script>

<style lang="scss" scoped>
/* Misma línea visual que la navegación principal (CatalogLayout .catalog-nav) */
.category-nav-wrapper {
  padding: 0 20px;
  max-width: 960px;
  margin: 0 auto 20px;
}

.category-pill-track {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(209, 151, 147, 0.08);
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.category-chip {
  flex-shrink: 0;
  border-radius: 999px !important;
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.02em;
  min-height: 38px !important;
  color: var(--ks-secondary, #d19793) !important;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  :deep(.q-btn__content) {
    gap: 6px;
  }

  &:hover {
    color: var(--ks-text, #000) !important;
    background: rgba(255, 255, 255, 0.85) !important;
  }

  &.category-chip--active {
    color: var(--ks-text, #000) !important;
    background: #ffffff !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }
}

.category-chip-icon {
  opacity: 0.95;
}

.category-chip--active .category-chip-icon {
  color: inherit;
}

@media (max-width: 768px) {
  .category-nav-wrapper {
    padding: 0 16px;
  }

  .category-pill-track {
    gap: 4px;
    padding: 3px;
  }

  .category-chip {
    font-size: 0.8125rem;
    min-height: 34px !important;
  }
}
</style>
