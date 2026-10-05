<template>
  <q-page class="admin-page">
    <div class="admin-authed-wrap">
      <q-inner-loading :showing="loading" color="dark" label="Cargando catálogo…" />

      <div class="admin-topbar">
        <div class="admin-topbar-info">
          <span class="admin-store-pill"><q-icon name="fa-solid fa-store" size="xs" /> {{ store.catalogSlug }}</span>
          <span v-if="store.sourceReady" class="admin-source-note">
            {{ productStats.total }} productos · {{ productStats.available }} disponibles · {{ productStats.sold }} vendidos
          </span>
        </div>

        <div class="admin-toolbar-actions">
          <q-input
            v-model="store.filter"
            outlined
            dense
            rounded
            clearable
            placeholder="Buscar producto…"
            class="admin-filter-input"
            hide-bottom-space
          >
            <template #prepend>
              <q-icon name="fa-solid fa-magnifying-glass" size="xs" color="grey-6" />
            </template>
          </q-input>

          <q-select
            v-model="store.sortMode"
            :options="store.ADMIN_CATALOG_SORT_OPTIONS"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            outlined
            dense
            rounded
            :disable="!store.sourceReady || loading"
            class="admin-sort-select"
            hide-bottom-space
          />

          <q-btn
            round
            outline
            color="grey-7"
            icon="fa-solid fa-arrows-rotate"
            :disable="loading"
            class="admin-btn"
            @click="reload"
          >
            <q-tooltip>Recargar</q-tooltip>
          </q-btn>
          <q-btn
            round
            outline
            color="grey-7"
            icon="fa-solid fa-tags"
            class="admin-btn"
            @click="categoriesDialogOpen = true"
          >
            <q-tooltip>Categorías</q-tooltip>
          </q-btn>
          <q-btn
            unelevated
            no-caps
            color="dark"
            icon="fa-solid fa-circle-plus"
            label="Nuevo producto"
            :disable="!store.sourceReady || loading"
            class="admin-btn admin-add-btn"
            @click="openAddProductDialog"
          />
        </div>
      </div>

      <div v-if="store.sourceReady && editableFiltered.length > 0" class="admin-grid">
        <div v-for="p in editableFiltered" :key="p.id" class="admin-product-card" @click="openEditProductDialog(p)">
          <div class="admin-card-image">
            <img v-if="p.images[0]?.url" :src="p.images[0].url" :alt="p.name" loading="lazy" />
            <div v-else class="admin-card-image-empty"><q-icon name="fa-regular fa-image" size="28px" /></div>

            <div class="admin-card-badges">
              <q-badge v-if="!p.visible" color="grey-8" rounded class="admin-badge">Oculto</q-badge>
              <q-badge v-if="p.sold" color="deep-orange-6" rounded class="admin-badge">Vendido</q-badge>
            </div>

            <q-btn
              round
              unelevated
              color="negative"
              icon="fa-solid fa-trash-can"
              class="admin-btn-sm admin-card-delete"
              @click.stop="confirmRemoveProduct(p)"
            >
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>

            <div class="admin-card-hover">
              <q-btn unelevated no-caps color="white" text-color="dark" icon="fa-solid fa-pen" label="Editar" class="admin-btn" />
            </div>
          </div>

          <div class="admin-card-body">
            <div class="admin-card-category">{{ p.categoryName ?? '' }}</div>
            <div class="admin-card-name">{{ p.name }}</div>
            <div class="admin-card-price">{{ formatListPrice(p) }}</div>
          </div>
        </div>
      </div>

      <div v-else-if="store.sourceReady" class="admin-empty-state">
        <q-icon name="fa-regular fa-box-open" size="48px" color="grey-5" />
        <p>No hay productos todavía.</p>
        <q-btn
          unelevated
          no-caps
          color="dark"
          icon="fa-solid fa-circle-plus"
          label="Crear el primero"
          class="admin-btn"
          @click="openAddProductDialog"
        />
      </div>

      <div v-else-if="!loading" class="admin-empty-state">
        <q-icon name="fa-solid fa-triangle-exclamation" size="40px" color="orange-6" />
        <p class="text-negative">No se pudo cargar el catálogo desde Firestore.</p>
      </div>

      <ProductFormDialog
        v-model="editorOpen"
        :product="editorProduct"
        @saved="reload"
        @request-delete="onRequestDeleteFromForm"
      />

      <CategoriesDialog v-model="categoriesDialogOpen" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import type { Product } from '@/types'
import { usePageSeo } from '@/composables/usePageSeo'
import { formatCurrency } from '@/utils/format'
import { useAdminFirestoreCatalogStore } from '@/stores/admin-firestore-catalog-store'
import ProductFormDialog from '@/components/admin/ProductFormDialog.vue'
import { useAdminProductEditor } from '@/composables/useAdminProductEditor'
import CategoriesDialog from '@/components/admin/CategoriesDialog.vue'

usePageSeo({
  title: 'Admin catálogo',
  description: 'Panel de administración del catálogo.',
  path: '/admin/catalogo',
  noIndex: true,
})

const store = useAdminFirestoreCatalogStore()
const loading = computed(() => store.loading)
const editableFiltered = computed(() => store.filtered)
const productStats = computed(() => {
  const total = store.products.length
  const sold = store.products.filter((p) => p.sold).length
  return { total, sold, available: total - sold }
})

onMounted(() => {
  if (!store.sourceReady && !loading.value) void store.load()
})

async function reload() {
  await store.load()
  Notify.create({ type: 'positive', message: 'Catálogo recargado' })
}

function formatListPrice(p: Product): string {
  return formatCurrency(p.price)
}

// ============================================
// Diálogo de producto (crear / editar): editor compartido con el catálogo público
// ============================================

const { editorOpen, editorProduct, openProductEditor, confirmDeleteProduct } = useAdminProductEditor()

function openAddProductDialog() {
  void openProductEditor(null)
}

function openEditProductDialog(p: Product) {
  void openProductEditor(p.id)
}

function confirmRemoveProduct(p: Product) {
  confirmDeleteProduct(p)
}

function onRequestDeleteFromForm() {
  const p = editorProduct.value
  if (!p) return
  editorOpen.value = false
  confirmDeleteProduct(p)
}

// Entrada directa por link: /admin/catalogo?edit={productId} abre el editor.
const route = useRoute()
const router = useRouter()
watch(
  () => [store.sourceReady, route.query.edit] as const,
  ([ready, editId]) => {
    if (!ready || typeof editId !== 'string') return
    void openProductEditor(editId)
    void router.replace({ query: {} })
  },
  { immediate: true },
)

const categoriesDialogOpen = ref(false)
</script>

<style scoped lang="scss">
.admin-page {
  background: #faf8f5;
  min-height: 100vh;
}

.admin-authed-wrap {
  position: relative;
  min-height: 240px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 24px 60px;
}

.admin-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.admin-topbar-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-store-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #000;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
}

.admin-source-note {
  font-size: 0.78rem;
  color: #9a9a9a;
}

.admin-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.admin-filter-input {
  width: 220px;

  :deep(.q-field__control) {
    background: #fff;
    min-height: 40px;
  }
}

.admin-sort-select {
  width: 190px;

  :deep(.q-field__control) {
    background: #fff;
    min-height: 40px;
  }
}

.admin-add-btn {
  border-radius: 999px;
  padding: 0 20px;
  font-weight: 600;

  :deep(.q-btn__content) {
    gap: 8px;
  }
}

// ============================================
// Grid de productos
// ============================================

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.admin-product-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 30px -10px rgba(0, 0, 0, 0.18);

    .admin-card-hover {
      opacity: 1;
    }

    .admin-card-image img {
      transform: scale(1.04);
    }
  }
}

.admin-card-image {
  position: relative;
  aspect-ratio: 1;
  background: #ececec;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.25s ease;
  }
}

.admin-card-image-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b4b4b4;
}

.admin-card-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.admin-badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 4px 9px;
}

.admin-card-delete {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 30px;
  height: 30px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.admin-product-card:hover .admin-card-delete {
  opacity: 1;
}

.admin-card-hover {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.28);
  opacity: 0;
  transition: opacity 0.18s ease;
}

.admin-card-body {
  padding: 12px 14px 16px;
}

.admin-card-category {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #d19793;
  margin-bottom: 3px;
}

.admin-card-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: #000;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.3em;
}

.admin-card-price {
  margin-top: 6px;
  font-size: 0.95rem;
  font-weight: 800;
  color: #000;
}

.admin-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 80px 20px;
  color: #8a8a8a;
  text-align: center;
}

.categories-card {
  width: 100%;
  max-width: 540px;
  border-radius: 18px;
}

.categories-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  font-weight: 700;
}
</style>
