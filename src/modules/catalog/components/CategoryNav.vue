<template>
  <div class="category-nav-wrapper" :class="{ 'can-left': canScrollLeft, 'can-right': canScrollRight }">
    <button v-if="canScrollLeft" type="button" class="nav-arrow nav-arrow--left" aria-label="Ver categorías anteriores" @click="scrollBy(-1)">
      <q-icon name="fa-solid fa-chevron-left" size="12px" />
    </button>
    <div
      ref="trackRef"
      class="category-pill-track"
      role="tablist"
      aria-label="Categorías de productos"
      @scroll.passive="updateScrollState"
    >
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

      <q-btn
        v-if="catalogStore.soldProducts.length"
        :class="['category-chip', 'category-chip--sold', { 'category-chip--active': isCategoryChipActive(SOLD_CATEGORY_ID) }]"
        flat
        no-caps
        unelevated
        padding="8px 14px"
        @click="selectCategory(SOLD_CATEGORY_ID)"
      >
        <q-icon name="fa-solid fa-heart" size="14px" class="category-chip-icon" />
        Vendidos
      </q-btn>
    </div>
    <button v-if="canScrollRight" type="button" class="nav-arrow nav-arrow--right" aria-label="Ver más categorías" @click="scrollBy(1)">
      <q-icon name="fa-solid fa-chevron-right" size="12px" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores'
import { SOLD_CATEGORY_ID } from '@/stores/catalog-store'
import { trackSelectCategory } from '@/utils/analytics'

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()

const categories = computed(() => catalogStore.categoriesWithStock)

const trackRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function updateScrollState() {
  const el = trackRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 4
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

function scrollBy(direction: 1 | -1) {
  const el = trackRef.value
  if (!el) return
  el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: 'smooth' })
}

function scrollActiveIntoView() {
  const active = trackRef.value?.querySelector<HTMLElement>('.category-chip--active')
  active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
}

onMounted(() => {
  void nextTick(updateScrollState)
  window.addEventListener('resize', updateScrollState)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateScrollState))

watch(categories, () => void nextTick(updateScrollState))
watch(
  () => [catalogStore.activeCategory, route.params.categorySlug],
  () => void nextTick(scrollActiveIntoView),
)

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
  trackSelectCategory(categoryId)
  // "Vendidos" no es una categoría real (no tiene página propia): se muestra en la portada.
  if (categoryId === SOLD_CATEGORY_ID && route.name === 'catalog-category') {
    void router.push({ name: 'catalog-home' })
    catalogStore.setActiveCategory(categoryId)
    return
  }
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
  position: relative;
  padding: 0 20px;
  max-width: 960px;
  margin: 0 auto 20px;
}

// Desvanecido en el borde donde hay más categorías: indica que se puede deslizar.
.can-right .category-pill-track {
  mask-image: linear-gradient(to right, #000 calc(100% - 48px), transparent);
}

.can-left .category-pill-track {
  mask-image: linear-gradient(to left, #000 calc(100% - 48px), transparent);
}

.can-left.can-right .category-pill-track {
  mask-image: linear-gradient(to right, transparent, #000 48px, #000 calc(100% - 48px), transparent);
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  display: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--ks-secondary, #d19793) 30%, transparent);
  background: var(--ks-surface, #fff);
  color: var(--ks-secondary, #d19793);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;

  &:hover {
    color: var(--ks-text, #000);
  }

  &--left {
    left: 8px;
  }

  &--right {
    right: 8px;
  }
}

@media (min-width: 600px) {
  .nav-arrow {
    display: inline-flex;
  }
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
  scroll-behavior: smooth;
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
