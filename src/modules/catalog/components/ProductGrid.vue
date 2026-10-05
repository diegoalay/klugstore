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
      <!-- Las primeras tarjetas son lo que se ve al abrir la página (LCP): cargan ya. -->
      <ProductCard
        v-for="(product, index) in visibleProducts"
        :key="product.id"
        :product="product"
        :priority="index < PRIORITY_CARDS"
      />
    </div>
    <!-- Al acercarse al final se agregan más tarjetas (los conteos/filtros usan todos). -->
    <div v-if="visibleCount < products.length" ref="sentinelRef" class="grid-sentinel" aria-hidden="true" />

    <div v-else class="empty-state">
      <q-icon name="fa-solid fa-box-open" size="48px" color="grey-5" />
      <p class="empty-text">No se encontraron productos</p>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * Tarjetas pintadas por grilla al salir de la página (en memoria, nivel de módulo: sobrevive
 * entre visitas dentro de la pestaña). Solo se escribe al desmontar, que no ocurre en SSR.
 */
const shownByKey = new Map<string, number>()
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Product } from '@/types'
import ProductCard from './ProductCard.vue'

/** Tarjetas visibles sin hacer scroll en celular (2 columnas) y escritorio (3). */
const PRIORITY_CARDS = 4
/**
 * Render incremental: se pintan de a BATCH tarjetas. El HTML pre-renderizado trae el primer
 * lote (igual que el primer render del cliente, así no hay hydration mismatch); cada producto
 * sigue teniendo su propia página pre-generada y está en sitemap.xml para buscadores.
 */
const BATCH = 24

const props = defineProps<{
  products: Product[]
  title?: string
  subtitle?: string | undefined
  showCount?: boolean
}>()

const route = useRoute()
// Al volver de una ficha (navegación del cliente, sin hidratación) se restauran las tarjetas
// que ya había, para que el scroll guardado caiga en el mismo lugar.
const restoreKey = `${route.fullPath}::${props.title ?? ''}`
const visibleCount = ref(shownByKey.get(restoreKey) ?? BATCH)
const visibleProducts = computed(() => props.products.slice(0, visibleCount.value))

// Cambió el filtro, la búsqueda o el orden: vuelve al primer lote. Se compara la lista de
// IDs y no el arreglo: el padre lo recalcula (arreglo nuevo, mismos productos) por cambios
// ajenos, como el refresco del catálogo en segundo plano.
watch(
  () => props.products.map((p) => p.id).join('|'),
  () => (visibleCount.value = BATCH),
)

const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function observeSentinel(el: HTMLElement | null) {
  observer?.disconnect()
  observer = null
  if (!el || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      visibleCount.value = Math.min(visibleCount.value + BATCH, props.products.length)
      // Si el centinela sigue a la vista (pantalla alta), el observer no vuelve a avisar
      // solo: se re-observa para evaluar de nuevo con el lote ya pintado.
      observer?.unobserve(el)
      requestAnimationFrame(() => observer?.observe(el))
    },
    // Empieza a pintar el siguiente lote un poco antes de llegar al final.
    { rootMargin: '800px 0px' },
  )
  observer.observe(el)
}

// El centinela existe desde el montaje y se crea/destruye al cambiar el filtro (v-if).
onMounted(() => observeSentinel(sentinelRef.value))
watch(sentinelRef, observeSentinel, { flush: 'post' })

onBeforeUnmount(() => {
  observer?.disconnect()
  shownByKey.set(restoreKey, visibleCount.value)
})
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

.grid-sentinel {
  height: 1px;
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
