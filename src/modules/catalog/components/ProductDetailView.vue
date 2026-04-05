<template>
  <div class="product-detail-container">
    <!-- Imagen principal y miniaturas -->
    <div class="product-image-section">
      <div
        class="product-image-main"
        :class="{ 'is-sold': isSold }"
        @click="openLightbox(activeImageIndex)"
      >
        <img
          v-if="activeImage"
          :src="activeImage.url"
          :alt="activeImage.alt || product.name"
          class="detail-image"
        />

        <div v-if="activeImage" class="image-zoom-hint">
          <q-icon name="fa-solid fa-magnifying-glass-plus" size="sm" />
        </div>

        <div v-if="isSold" class="sold-overlay">
          <span class="sold-label">Vendido</span>
        </div>

        <q-badge
          v-if="!isSold && discountPercent"
          class="discount-badge"
          :style="{ backgroundColor: theme?.secondaryColor ?? '#d19793' }"
        >
          -{{ discountPercent }}%
        </q-badge>

        <q-badge
          v-else-if="!isSold && product.discount"
          class="discount-badge"
          :style="{ backgroundColor: theme?.secondaryColor ?? '#d19793' }"
        >
          {{ product.discount }}
        </q-badge>
      </div>

      <div v-if="product.images.length > 1" class="image-thumbnails">
        <div
          v-for="(img, index) in product.images"
          :key="index"
          :class="['thumbnail', { active: activeImageIndex === index }]"
          @click="activeImageIndex = index"
        >
          <img :src="img.url" :alt="img.alt" />
        </div>
      </div>
    </div>

    <q-dialog v-model="lightboxOpen" maximized transition-show="fade" transition-hide="fade">
      <div class="lightbox-container">
        <q-btn
          flat
          round
          dense
          icon="fa-solid fa-xmark"
          class="lightbox-close"
          @click="lightboxOpen = false"
        />

        <q-carousel
          v-model="lightboxSlide"
          swipeable
          animated
          arrows
          infinite
          :navigation="product.images.length > 1"
          control-color="white"
          class="lightbox-carousel"
        >
          <q-carousel-slide
            v-for="(img, i) in product.images"
            :key="i"
            :name="i"
            class="lightbox-slide"
          >
            <img :src="img.url" :alt="img.alt" class="lightbox-image" />
          </q-carousel-slide>
        </q-carousel>

        <div class="lightbox-counter">
          {{ lightboxSlide + 1 }} / {{ product.images.length }}
        </div>
      </div>
    </q-dialog>

    <!-- Información -->
    <div class="product-info-section">
      <div class="product-heading">
        <p class="product-category-label">{{ product.categoryName }}</p>
        <button
          type="button"
          class="share-btn"
          :aria-label="shareLabel"
          :title="shareLabel"
          @click="copyShareLink"
        >
          <q-icon :name="justCopied ? 'fa-solid fa-check' : 'fa-solid fa-link'" size="xs" />
          <span>{{ justCopied ? 'Enlace copiado' : 'Compartir' }}</span>
        </button>
      </div>

      <component :is="titleHeading" class="product-title">{{ product.name }}</component>

      <div class="product-pricing">
        <span class="price-current">{{ formattedPrice }}</span>
        <span v-if="product.compareAtPrice" class="price-compare">
          {{ formattedComparePrice }}
        </span>
        <q-badge
          v-if="discountPercent"
          class="price-discount-chip"
          :style="{ backgroundColor: theme?.secondaryColor ?? '#e2725b' }"
        >
          Ahorra {{ discountPercent }}%
        </q-badge>
      </div>

      <p class="product-description">{{ product.description }}</p>

      <div v-if="product.measure" class="product-measure">
        <span class="product-measure__label">Medidas</span>
        <p class="product-measure__value">{{ product.measure }}</p>
      </div>

      <div v-if="product.variants?.length" class="product-variants">
        <p class="variants-label">Opciones:</p>
        <div class="variants-list">
          <q-btn
            v-for="variant in product.variants"
            :key="variant.id"
            :class="['variant-btn', { active: selectedVariant === variant.id }]"
            no-caps
            unelevated
            :disable="!variant.available"
            @click="selectedVariant = variant.id"
          >
            {{ variant.name }}
          </q-btn>
        </div>
      </div>

      <div v-if="product.tags?.length" class="product-tags">
        <span v-for="tag in product.tags" :key="tag" class="tag-chip">
          {{ tag }}
        </span>
      </div>

      <template v-if="!isSold">
        <q-btn
          class="cta-whatsapp"
          no-caps
          unelevated
          icon="fa-brands fa-whatsapp"
          label="Comprar"
          :style="{
            backgroundColor: theme?.primaryColor ?? '#000000',
            color: '#ffffff',
          }"
          @click="handleWhatsApp"
        />
        <p class="cta-hint">
          <q-icon name="fa-solid fa-shield-check" size="xs" />
          Compra segura por WhatsApp
        </p>
      </template>

      <template v-else>
        <q-btn
          class="cta-whatsapp cta-sold"
          no-caps
          unelevated
          disable
          icon="fa-solid fa-circle-check"
          label="Vendido"
        />
        <p class="cta-hint cta-hint--sold">
          Esta pieza ya fue vendida.
          <a href="#" class="cta-sold-link" @click.prevent="onAskSimilarClick">
            ¿Buscas algo similar?
          </a>
        </p>
      </template>

      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStoreConfigStore } from 'src/stores'
import { useWhatsApp } from 'src/composables/useWhatsApp'
import type { Product } from 'src/types'

const props = withDefaults(
  defineProps<{
    product: Product
    /** Si se omite, al compartir se usa `window.location.href` (página completa). */
    shareUrl?: string | null
    titleHeading?: 'h1' | 'h2'
  }>(),
  {
    shareUrl: null,
    titleHeading: 'h1',
  },
)

const emit = defineEmits<{
  askSimilar: []
}>()

const storeConfig = useStoreConfigStore()
const { openWhatsApp } = useWhatsApp()

const activeImageIndex = ref(0)
const selectedVariant = ref<string | null>(null)
const lightboxOpen = ref(false)
const lightboxSlide = ref(0)
const justCopied = ref(false)

watch(
  () => props.product.id,
  () => {
    activeImageIndex.value = 0
    selectedVariant.value = null
    lightboxOpen.value = false
  },
)

const theme = computed(() => storeConfig.theme)

const activeImage = computed(
  () =>
    props.product.images[activeImageIndex.value] ?? props.product.images[0] ?? null,
)

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

const isSold = computed(() => props.product.sold === true)

const shareLabel = computed(() =>
  props.product ? `Copiar enlace de ${props.product.name}` : 'Copiar enlace del producto',
)

function openLightbox(index: number) {
  if (!props.product.images.length) return
  lightboxSlide.value = index
  lightboxOpen.value = true
}

function handleWhatsApp() {
  openWhatsApp(props.product)
}

async function copyShareLink() {
  const url =
    props.shareUrl ??
    (typeof window !== 'undefined' ? window.location.href : '')
  if (!url) return

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.setAttribute('readonly', '')
      ta.style.position = 'absolute'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    justCopied.value = true
    setTimeout(() => {
      justCopied.value = false
    }, 2000)
  } catch (err) {
    console.warn('[share] copy failed:', err)
  }
}

function onAskSimilarClick() {
  emit('askSimilar')
}
</script>

<style lang="scss" scoped>
.product-detail-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 40px;
}

.product-image-section,
.product-info-section {
  min-width: 0;
}

.product-image-main {
  position: relative;
  border-radius: var(--ks-radius, 16px);
  overflow: hidden;
  background: var(--ks-surface, #ffffff);
  aspect-ratio: 1;
  cursor: zoom-in;
  width: 100%;
  max-width: 100%;
}

.detail-image {
  width: 100%;
  height: 100%;
  max-width: 100%;
  object-fit: cover;
  display: block;
}

.image-zoom-hint {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.product-image-main:hover .image-zoom-hint {
  opacity: 1;
}

.sold-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(0.5px);
}

.sold-label {
  display: inline-block;
  padding: 8px 28px;
  background: rgba(0, 0, 0, 0.82);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  border-radius: 6px;
  transform: rotate(-6deg);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.lightbox-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  color: white !important;
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(4px);
  min-height: 44px !important;
  width: 44px;
  height: 44px;
}

.lightbox-carousel {
  width: 100%;
  height: 100%;
  background: transparent;
}

.lightbox-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: transparent;
}

.lightbox-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.lightbox-counter {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 0.9rem;
  background: rgba(0, 0, 0, 0.5);
  padding: 6px 14px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  z-index: 10;
}

.discount-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 6px 14px;
  border-radius: 10px;
}

.image-thumbnails {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-bottom: 4px;

  &::-webkit-scrollbar {
    display: none;
  }
}

.thumbnail {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s ease;

  &.active {
    border-color: var(--ks-primary, #1a1a2e);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.product-info-section {
  padding-top: 8px;
}

.product-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;

  .product-category-label {
    margin: 0;
  }
}

.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(209, 151, 147, 0.1);
  border: 1px solid var(--ks-secondary, #d19793);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ks-secondary, #d19793);
  cursor: pointer;
  letter-spacing: 0.02em;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.15s ease;

  &:hover {
    background: rgba(209, 151, 147, 0.18);
  }

  &:active {
    transform: scale(0.97);
  }

  :deep(.q-icon) {
    font-size: 0.8rem;
  }
}

.product-category-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--ks-text-secondary, #6b7280);
  margin: 0 0 8px;
  font-weight: 600;
}

.product-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--ks-text, #1a1a2e);
  margin: 0 0 16px;
  line-height: 1.2;
}

.product-pricing {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.price-current {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--ks-text, #1a1a2e);
}

.price-compare {
  font-size: 1rem;
  color: var(--ks-text-secondary, #6b7280);
  text-decoration: line-through;
}

.price-discount-chip {
  font-weight: 600;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 8px;
}

.product-description {
  font-size: 0.95rem;
  color: var(--ks-text-secondary, #6b7280);
  line-height: 1.6;
  margin: 0 0 24px;
  white-space: pre-wrap;
}

.product-measure {
  margin: -8px 0 24px;
}

.product-measure__label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  color: var(--ks-text-secondary, #6b7280);
  margin-bottom: 6px;
}

.product-measure__value {
  font-size: 0.95rem;
  color: var(--ks-text, #1a1a2e);
  line-height: 1.55;
  margin: 0;
  padding: 12px 14px;
  background: var(--ks-surface, #ffffff);
  border-radius: calc(var(--ks-radius, 16px) - 4px);
  border: 1px solid color-mix(in srgb, var(--ks-secondary, #d19793) 22%, transparent);
}

.product-variants {
  margin-bottom: 24px;
}

.variants-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ks-text, #1a1a2e);
  margin: 0 0 8px;
}

.variants-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.variant-btn {
  border-radius: 10px !important;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 8px 16px !important;
  min-height: 36px !important;
  background: var(--ks-bg, #f5f5f5) !important;
  color: var(--ks-text, #1a1a2e) !important;
  border: 1px solid transparent !important;

  &.active {
    border-color: var(--ks-primary, #1a1a2e) !important;
    background: var(--ks-surface, #fff) !important;
  }
}

.product-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  background: rgba(209, 151, 147, 0.12);
  color: var(--ks-secondary, #d19793);
  font-weight: 600;
  font-size: 0.7rem;
  padding: 5px 12px;
  border-radius: 999px;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.cta-whatsapp {
  width: 100%;
  border-radius: 12px !important;
  font-weight: 600;
  font-size: 0.9rem;
  min-height: 44px !important;
  padding: 10px 20px !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  }
}

.cta-hint {
  text-align: center;
  font-size: 0.75rem;
  color: var(--ks-text-secondary, #6b7280);
  margin: 12px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.cta-hint--sold {
  font-size: 0.8rem;
  color: var(--ks-text, #000);
  flex-wrap: wrap;
}

.cta-sold-link {
  color: var(--ks-secondary, #d19793);
  text-decoration: none;
  font-weight: 600;
  border-bottom: 1px solid transparent;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;

  &:hover {
    color: var(--ks-secondary, #d19793);
    border-bottom-color: var(--ks-secondary, #d19793);
  }
}

.cta-sold {
  background: #f0f0f0 !important;
  color: #9a9a9a !important;
  cursor: not-allowed !important;
  opacity: 1 !important;
  box-shadow: none !important;
  border: 1px solid #e5e5e5 !important;

  :deep(.q-btn__content) {
    letter-spacing: 0.06em;
  }

  &:hover {
    box-shadow: none !important;
  }
}

@media (max-width: 768px) {
  .product-detail-container {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
    padding: 16px;
  }

  .product-title {
    font-size: 1.3rem;
  }

  .price-current {
    font-size: 1.3rem;
  }
}
</style>
