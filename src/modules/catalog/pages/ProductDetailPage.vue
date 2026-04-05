<template>
  <q-page v-if="product" class="product-detail">
    <div class="back-link-wrapper">
      <button class="back-link" @click="handleBack">
        <q-icon name="fa-solid fa-arrow-left" size="xs" />
        <span>Volver al catálogo</span>
      </button>
    </div>

    <div class="product-detail-container">
      <!-- Image -->
      <div class="product-image-section">
        <div class="product-image-main" @click="openLightbox(activeImageIndex)">
          <img
            v-if="activeImage"
            :src="activeImage.url"
            :alt="activeImage.alt || product.name"
            class="detail-image"
          />

          <div class="image-zoom-hint">
            <q-icon name="fa-solid fa-magnifying-glass-plus" size="sm" />
          </div>

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
        </div>

        <!-- Thumbnails -->
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

      <!-- Lightbox carrusel -->
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

      <!-- Info -->
      <div class="product-info-section">
        <p class="product-category-label">{{ product.categoryName }}</p>
        <h1 class="product-title">{{ product.name }}</h1>

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

        <!-- Variants -->
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

        <!-- Tags -->
        <div v-if="product.tags?.length" class="product-tags">
          <q-badge
            v-for="tag in product.tags"
            :key="tag"
            class="tag-chip"
          >
            {{ tag }}
          </q-badge>
        </div>

        <!-- WhatsApp CTA -->
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
      </div>
    </div>
  </q-page>

  <!-- Not found -->
  <q-page v-else class="product-not-found">
    <div class="not-found-content">
      <q-icon name="fa-solid fa-box-open" size="64px" color="grey-5" />
      <h2>Producto no encontrado</h2>
      <q-btn
        no-caps
        unelevated
        label="Volver al catálogo"
        :style="{
          backgroundColor: theme?.primaryColor ?? '#1a1a2e',
          color: '#ffffff',
        }"
        @click="goHome"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore, useStoreConfigStore } from 'src/stores'
import { useWhatsApp } from 'src/composables/useWhatsApp'
import { usePageSeo, truncateSeoDescription } from 'src/composables/usePageSeo'

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()
const storeConfig = useStoreConfigStore()
const { openWhatsApp } = useWhatsApp()

const activeImageIndex = ref(0)
const selectedVariant = ref<string | null>(null)
const lightboxOpen = ref(false)
const lightboxSlide = ref(0)

function openLightbox(index: number) {
  lightboxSlide.value = index
  lightboxOpen.value = true
}

const theme = computed(() => storeConfig.theme)

const product = computed(() => {
  const slug = route.params.productSlug as string
  return catalogStore.getProductBySlug(slug)
})

const productPath = computed(() => {
  const slug = route.params.productSlug as string
  return `/catalog/producto/${slug}`
})

const seoTitle = computed(() => {
  if (!product.value) return `Producto no encontrado | ${storeConfig.seoTitleSuffix}`
  return `${product.value.name} | ${storeConfig.seoTitleSuffix}`
})

const seoDescription = computed(() => {
  if (!product.value) {
    return `El producto solicitado no existe en el catálogo de ${storeConfig.storeName}.`
  }
  return truncateSeoDescription(
    `${product.value.description} ${product.value.categoryName ?? ''} · ${storeConfig.storeName}, Guatemala.`,
  )
})

usePageSeo({
  title: seoTitle,
  description: seoDescription,
  path: productPath,
  noIndex: computed(() => !product.value),
})

const activeImage = computed(() => {
  if (!product.value) return null
  return product.value.images[activeImageIndex.value] ?? product.value.images[0] ?? null
})

const formattedPrice = computed(() => {
  if (!product.value) return ''
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: product.value.currency || storeConfig.currency,
  }).format(product.value.price)
})

const formattedComparePrice = computed(() => {
  if (!product.value?.compareAtPrice) return ''
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: product.value.currency || storeConfig.currency,
  }).format(product.value.compareAtPrice)
})

const discountPercent = computed(() => {
  if (!product.value?.compareAtPrice) return 0
  return Math.round(
    ((product.value.compareAtPrice - product.value.price) / product.value.compareAtPrice) * 100,
  )
})

function handleWhatsApp() {
  if (product.value) openWhatsApp(product.value)
}

function goHome() {
  void router.push({ name: 'catalog-home' })
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    goHome()
  }
}
</script>

<style lang="scss" scoped>
.product-detail {
  background: var(--ks-bg, #faf8f5);
  padding-bottom: 40px;
}

.back-link-wrapper {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px 20px 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--ks-text-secondary, #6b6b6b);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 10px 6px 0;
  transition: all 0.2s ease;

  &:hover {
    color: var(--ks-primary, #000);
    transform: translateX(-2px);
  }
}

@media (max-width: 768px) {
  .back-link-wrapper {
    padding: 14px 16px 0;
  }
}

.product-detail-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 40px;
}

// Previene overflow horizontal causado por imágenes intrínsecamente grandes
// dentro de grid items (min-width: auto por defecto en grid).
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

.detail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  background: var(--ks-bg, #f5f5f5) !important;
  color: var(--ks-text-secondary, #6b7280) !important;
  font-weight: 500;
  font-size: 0.7rem;
  padding: 4px 10px;
  border-radius: 6px;
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

.product-not-found {
  background: var(--ks-bg, #faf8f5);
}

.not-found-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;

  h2 {
    color: var(--ks-text-secondary, #6b7280);
    font-size: 1.1rem;
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
