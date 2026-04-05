<template>
  <q-dialog
    :model-value="quickViewProduct !== null"
    transition-show="scale"
    transition-hide="scale"
    content-class="product-quick-dialog-inner"
    @update:model-value="onDialogModel"
  >
    <q-card v-if="p" class="product-quick-card">
      <q-btn
        flat
        round
        dense
        icon="fa-solid fa-xmark"
        class="product-quick-close"
        aria-label="Cerrar"
        @click="closeProductQuickView"
      />

      <div class="product-quick-scroll">
        <ProductDetailView
          :product="p"
          :share-url="productShareUrl"
          title-heading="h2"
          class="product-quick-detail-root"
          @ask-similar="askForSimilar"
        >
          <template #footer>
            <router-link
              class="product-quick-full-link"
              :to="{ name: 'catalog-product', params: { productSlug: p.slug } }"
              @click="onOpenFullPage"
            >
              Abrir ficha en página
            </router-link>
          </template>
        </ProductDetailView>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ProductDetailView from 'src/modules/catalog/components/ProductDetailView.vue'
import { useProductQuickView } from 'src/composables/useProductQuickView'
import { stashCatalogHashBeforeProductNavigation } from 'src/composables/useCatalogHash'

const router = useRouter()
const { quickViewProduct, closeProductQuickView } = useProductQuickView()

const p = computed(() => quickViewProduct.value)

const productShareUrl = computed(() => {
  if (typeof window === 'undefined' || !p.value) return ''
  return `${window.location.origin}/catalog/producto/${p.value.slug}`
})

function onDialogModel(open: boolean) {
  if (!open) closeProductQuickView()
}

function onOpenFullPage() {
  stashCatalogHashBeforeProductNavigation()
  closeProductQuickView()
}

function askForSimilar() {
  const prod = p.value
  closeProductQuickView()
  if (!prod) {
    void router.push({ name: 'catalog-home' })
    return
  }
  void router.push({
    name: 'catalog-category',
    params: { categorySlug: prod.categoryId },
  })
}
</script>

<style lang="scss">
.product-quick-dialog-inner {
  padding: 10px 8px;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;

  @media (min-width: 768px) {
    padding: 12px;
    max-width: none;
  }
}
</style>

<style scoped lang="scss">
.product-quick-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: var(--ks-surface, #fff);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);

  @media (min-width: 768px) {
    width: 70vw;
  }
}

.product-quick-close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  color: var(--ks-text-secondary, #6b7280);
}

.product-quick-scroll {
  max-height: 80vh;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-top: 40px;
}

/* Anula padding superior del contenedor compartido: el scroll ya deja hueco al botón cerrar. */
.product-quick-detail-root.product-detail-container {
  padding-top: 0;
}

.product-quick-full-link {
  display: block;
  margin-top: 18px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--ks-text-secondary, #6b7280);
  text-decoration: underline;
}
</style>
