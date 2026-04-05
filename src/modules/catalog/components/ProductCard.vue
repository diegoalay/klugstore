<template>
  <q-card
    ref="cardRef"
    class="product-card"
    :class="{ 'is-revealed': isRevealed }"
    flat
    @click="goToProduct"
  >
    <div class="product-image-container">
      <img
        :src="product.images[0]?.url"
        :alt="product.images[0]?.alt || product.name"
        class="product-image"
        loading="lazy"
      />

      <q-badge
        v-if="discountPercent"
        class="discount-badge"
        :style="{ backgroundColor: theme?.secondaryColor ?? '#d19793' }"
      >
        -{{ discountPercent }}%
      </q-badge>

      <q-badge
        v-else-if="product.discount"
        class="discount-badge"
        :style="{ backgroundColor: theme?.secondaryColor ?? '#d19793' }"
      >
        {{ product.discount }}
      </q-badge>

      <q-badge
        v-if="product.featured"
        class="featured-badge"
        :style="{ backgroundColor: theme?.accentColor ?? '#f4a261' }"
        text-color="dark"
      >
        Destacado
      </q-badge>
    </div>

    <q-card-section class="product-info">
      <p class="product-category">{{ product.categoryName }}</p>
      <h3 class="product-name">{{ product.name }}</h3>
      <p v-if="product.shortDescription" class="product-short-desc">
        {{ product.shortDescription }}
      </p>

      <div class="product-pricing">
        <span class="product-price">{{ formattedPrice }}</span>
        <span v-if="product.compareAtPrice" class="product-compare-price">
          {{ formattedComparePrice }}
        </span>
      </div>
    </q-card-section>

    <q-card-actions class="product-actions">
      <q-btn
        class="whatsapp-btn"
        no-caps
        unelevated
        icon="fa-brands fa-whatsapp"
        label="Comprar"
        :style="{
          backgroundColor: theme?.primaryColor ?? '#000000',
          color: '#ffffff',
        }"
        @click.stop="handleWhatsApp"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { QCard } from 'quasar'
import { useStoreConfigStore } from 'src/stores'
import { useWhatsApp } from 'src/composables/useWhatsApp'
import { stashCatalogHashBeforeProductNavigation } from 'src/composables/useCatalogHash'
import type { Product } from 'src/types'

const props = defineProps<{
  product: Product
}>()

const router = useRouter()
const storeConfig = useStoreConfigStore()
const { openWhatsApp } = useWhatsApp()

const cardRef = ref<InstanceType<typeof QCard> | null>(null)
const isRevealed = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  // Respeta accesibilidad: si el usuario prefiere reducir animación, mostramos directo.
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    isRevealed.value = true
    return
  }
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) {
    isRevealed.value = true
    return
  }

  const el = (cardRef.value as unknown as { $el?: HTMLElement })?.$el
  if (!el) {
    isRevealed.value = true
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          isRevealed.value = true
          observer?.disconnect()
          observer = null
          break
        }
      }
    },
    {
      // Revela un poco antes de entrar al viewport para que el usuario
      // nunca vea el momento exacto del "pop".
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.05,
    },
  )
  observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

const theme = computed(() => storeConfig.theme)

const formattedPrice = computed(() =>
  new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: props.product.currency || storeConfig.currency,
  }).format(props.product.price),
)

const formattedComparePrice = computed(() => {
  if (!props.product.compareAtPrice) return ''
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: props.product.currency || storeConfig.currency,
  }).format(props.product.compareAtPrice)
})

const discountPercent = computed(() => {
  if (!props.product.compareAtPrice) return 0
  return Math.round(
    ((props.product.compareAtPrice - props.product.price) / props.product.compareAtPrice) * 100,
  )
})

function goToProduct() {
  stashCatalogHashBeforeProductNavigation()
  void router.push({
    name: 'catalog-product',
    params: { productSlug: props.product.slug },
  })
}

function handleWhatsApp() {
  openWhatsApp(props.product)
}
</script>

<style lang="scss" scoped>
.product-card {
  border-radius: var(--ks-radius, 16px);
  overflow: hidden;
  cursor: pointer;
  background: var(--ks-surface, #ffffff);
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  height: 100%;

  // Scroll reveal: estado inicial (oculto)
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s ease,
    border-color 0.25s ease;

  &.is-revealed {
    opacity: 1;
    transform: translateY(0);
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
    border-color: var(--ks-bg, #f0f0f0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .product-card {
    opacity: 1;
    transform: none;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }
}

.product-image-container {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--ks-bg, #f5f5f5);
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;

  .product-card:hover & {
    transform: scale(1.05);
  }
}

.discount-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  font-weight: 700;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 8px;
}

.featured-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-weight: 600;
  font-size: 0.7rem;
  padding: 4px 10px;
  border-radius: 8px;
}

.product-info {
  padding: 14px 16px 8px;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}

.product-category {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--ks-text-secondary, #6b7280);
  margin: 0 0 4px;
  font-weight: 600;
}

.product-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ks-text, #1a1a2e);
  margin: 0 0 4px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-short-desc {
  font-size: 0.8rem;
  color: var(--ks-text-secondary, #6b7280);
  margin: 0 0 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-pricing {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

.product-price {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--ks-text, #1a1a2e);
}

.product-compare-price {
  font-size: 0.85rem;
  color: var(--ks-text-secondary, #6b7280);
  text-decoration: line-through;
}

.product-actions {
  padding: 0 16px 14px;
  margin-top: auto;
}

.whatsapp-btn {
  width: 100%;
  border-radius: calc(var(--ks-radius, 16px) - 4px) !important;
  font-weight: 600;
  font-size: 0.85rem;
  min-height: 42px !important;
  padding: 10px 16px !important;
}

@media (max-width: 768px) {
  .product-name {
    font-size: 0.88rem;
  }

  .product-price {
    font-size: 1rem;
  }

  .product-actions {
    padding: 0 12px 12px;
  }

  .whatsapp-btn {
    min-height: 38px !important;
    font-size: 0.8rem;
  }
}
</style>
