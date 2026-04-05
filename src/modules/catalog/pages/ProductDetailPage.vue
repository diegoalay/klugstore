<template>
  <q-page v-if="product" class="product-detail">
    <div class="back-link-wrapper">
      <button class="back-link" @click="handleBack">
        <q-icon name="fa-solid fa-arrow-left" size="xs" />
        <span>Volver al catálogo</span>
      </button>
    </div>

    <ProductDetailView :product="product" @ask-similar="askForSimilar" />
  </q-page>

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
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductDetailView from 'src/modules/catalog/components/ProductDetailView.vue'
import { useCatalogStore, useStoreConfigStore } from 'src/stores'
import { usePageSeo, truncateSeoDescription } from 'src/composables/usePageSeo'
import { CATALOG_RETURN_HASH_KEY } from 'src/composables/useCatalogHash'

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()
const storeConfig = useStoreConfigStore()

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

function askForSimilar() {
  const p = product.value
  if (!p) {
    void router.push({ name: 'catalog-home' })
    return
  }
  void router.push({
    name: 'catalog-category',
    params: { categorySlug: p.categoryId },
  })
}

function goHome() {
  sessionStorage.removeItem(CATALOG_RETURN_HASH_KEY)
  void router.push({ name: 'catalog-home' })
}

function handleBack() {
  const raw = sessionStorage.getItem(CATALOG_RETURN_HASH_KEY)
  sessionStorage.removeItem(CATALOG_RETURN_HASH_KEY)
  if (raw !== null) {
    const hash = raw.startsWith('#') ? raw : raw ? `#${raw}` : ''
    void router.push(
      hash
        ? { name: 'catalog-home', hash }
        : { name: 'catalog-home' },
    )
    return
  }
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
</style>
