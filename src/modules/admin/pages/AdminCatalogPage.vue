<template>
  <q-page padding class="admin-page">
    <div class="admin-authed-wrap">
      <q-inner-loading :showing="loadingDraft" color="dark" label="Cargando fuente del catálogo…" />

      <q-banner rounded class="bg-amber-2 text-dark admin-banner">
        <strong>Tienda activa:</strong> <code>{{ catalogSlug }}</code>
        (subdominio / <code>DOMAIN_MAP</code> en <code>storeResolver.ts</code> + JSON en
        <code>data/products/</code>). En local: <code>sweethome.localhost</code> o
        <code>{slug}.klugstore.app</code>.<br />
        <strong>Fuente de datos:</strong> misma prioridad que la tienda — Google Sheets (si
        <code>.env</code> lo define), luego JSON remoto, luego JSON empaquetado.<br />
        <strong>Borrador en memoria (Pinia):</strong> solo existe con sesión admin; al cerrar sesión se
        vacía. Exporta JSON o CSV para persistir.<br />
        Slugs en este build:
        <code>{{ catalogSlugsLabel }}</code>.
      </q-banner>

      <q-card flat bordered class="admin-toolbar-card q-mb-lg">
        <q-card-section class="admin-toolbar-inner">
          <div class="row q-col-gutter-md items-stretch items-md-end">
            <div class="col-12 col-md-4 admin-toolbar-field-col">
              <q-input
                v-model="filter"
                outlined
                dense
                stack-label
                clearable
                label="Búsqueda"
                placeholder="Id, nombre o categoría"
                class="admin-filter-input"
                hide-bottom-space
              />
            </div>
            <div class="col-12 col-md-4 admin-toolbar-field-col">
              <q-select
                v-model="sortMode"
                :options="ADMIN_CATALOG_SORT_OPTIONS"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                dense
                stack-label
                label="Orden"
                :disable="!sourceReady || loadingDraft"
                class="admin-sort-select"
                hide-bottom-space
              />
            </div>
            <div class="col-12 col-md-4 admin-toolbar-actions-col">
              <q-separator class="admin-toolbar-sep gt-sm" vertical inset />
              <div class="admin-toolbar-actions">
                <q-btn
                  outline
                  color="grey-7"
                  size="md"
                  no-caps
                  icon="fa-solid fa-rotate"
                  label="Recargar"
                  :disable="loadingDraft"
                  class="admin-toolbar-btn"
                  @click="draft.reloadFromSource"
                >
                  <q-tooltip>Limpia caché de Sheets/remoto y vuelve a descargar</q-tooltip>
                </q-btn>
                <q-btn
                  unelevated
                  color="positive"
                  size="md"
                  no-caps
                  icon="fa-solid fa-plus"
                  label="Agregar"
                  :disable="!sourceReady || loadingDraft"
                  class="admin-toolbar-btn"
                  @click="openAddProductDialog"
                />
                <q-btn-dropdown
                  outline
                  color="grey-7"
                  size="md"
                  no-caps
                  label="Exportar"
                  class="admin-toolbar-btn admin-toolbar-dropdown"
                  :disable="!sourceReady"
                >
                  <q-list>
                    <q-item v-close-popup clickable @click="exportJson">
                      <q-item-section>
                        <q-item-label>Overlay JSON (admin)</q-item-label>
                        <q-item-label caption>Para aplicar al repo con apply-overlay</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item v-close-popup clickable @click="exportCsvProducts">
                      <q-item-section>
                        <q-item-label>CSV productos</q-item-label>
                        <q-item-label caption>Pestaña <code>products</code> en Sheets</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item v-close-popup clickable @click="exportCsvCategories">
                      <q-item-section>
                        <q-item-label>CSV categorías</q-item-label>
                        <q-item-label caption>Pestaña <code>categories</code></q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item v-close-popup clickable @click="exportCsvSheetsBundle">
                      <q-item-section>
                        <q-item-label>Ambos CSV (Sheets)</q-item-label>
                        <q-item-label caption>Dos descargas seguidas</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-btn-dropdown>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-list bordered separator class="admin-list rounded-borders">
        <q-expansion-item
          v-for="p in filtered"
          :id="'admin-product-' + p.id"
          :key="p.id"
          :model-value="expandedProductId === p.id"
          expand-separator
          class="admin-expansion-item"
          @update:model-value="(open) => onExpansionUpdate(p.id, open)"
        >
          <template #header>
            <q-item-section avatar class="admin-header-avatar">
              <img
                v-if="draft.previewPrimaryUrl(p)"
                :src="String(draft.previewPrimaryUrl(p))"
                :alt="p.name"
                class="admin-header-thumb"
                loading="lazy"
              />
              <q-icon v-else name="fa-solid fa-box" color="grey-7" class="admin-header-thumb-fallback" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="admin-list-title-row">
                <span class="admin-list-title-text">{{ p.name }}</span>
                <q-badge
                  v-if="!draft.isProductInBaseSource(p.id)"
                  color="amber-2"
                  text-color="dark"
                  rounded
                  class="admin-draft-only-badge"
                >
                  Solo borrador
                  <q-tooltip
                    anchor="bottom middle"
                    self="top middle"
                    :offset="[0, 6]"
                    class="bg-grey-9 text-body2"
                    style="max-width: 280px"
                  >
                    Este ID no está en la fuente cargada. Exportá overlay JSON o CSV y aplicá en el repo /
                    Sheets para que exista en la próxima sincronización.
                  </q-tooltip>
                </q-badge>
              </q-item-label>
              <q-item-label caption>{{ p.id }} · {{ p.categoryName ?? '' }}</q-item-label>
              <q-item-label caption class="admin-list-price-measure text-grey-8">
                {{ formatListPrice(p) }}
                <span class="q-mx-xs text-grey-5">·</span>
                <span class="admin-list-measure">{{ listMeasureLabel(p) }}</span>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                dense
                no-caps
                color="negative"
                icon="fa-solid fa-trash-can"
                label="Eliminar"
                @click.stop="confirmRemoveProduct(p)"
              />
            </q-item-section>
          </template>
          <q-card flat class="admin-expansion-card">
            <q-card-section class="admin-form-section">
              <div class="row q-col-gutter-lg admin-form-grid">
                <div class="col-12 col-md-4">
                  <div class="admin-image-block">
                    <div class="admin-image-main">
                      <img
                        v-if="draft.previewPrimaryUrl(p)"
                        :src="String(draft.previewPrimaryUrl(p))"
                        :alt="p.name"
                        class="admin-img-main"
                      />
                      <div v-else class="admin-image-placeholder">Sin imagen</div>
                    </div>
                    <div v-if="draft.previewImageUrls(p).length > 1" class="admin-thumb-strip">
                      <img
                        v-for="(url, idx) in draft.previewImageUrls(p)"
                        :key="idx"
                        :src="url"
                        :alt="p.name"
                        class="admin-thumb"
                        loading="lazy"
                      />
                    </div>
                    <p class="admin-image-hint text-caption text-grey-7 q-mt-sm q-mb-none">
                      Vista previa desde las URLs de abajo. La primera es la portada en el catálogo.
                    </p>
                  </div>
                </div>

                <div class="col-12 col-md-8">
                  <div class="row q-col-gutter-md admin-fields-grid">
                    <div class="col-12 col-sm-6 admin-field-wrap">
                      <q-input v-model="p.name" outlined stack-label label="Nombre" class="admin-q-field" />
                    </div>
                    <div class="col-12 col-sm-3 admin-field-wrap">
                      <q-input
                        v-model.number="p.price"
                        outlined
                        stack-label
                        type="number"
                        label="Precio (GTQ)"
                        step="0.01"
                        class="admin-q-field"
                      />
                    </div>
                    <div class="col-12 col-sm-3 admin-field-wrap flex items-center admin-toggle-wrap">
                      <q-toggle v-model="p.visible" label="Visible en tienda" left-label color="dark" />
                    </div>
                    <div class="col-12 admin-field-wrap">
                      <q-input
                        v-model="p.description"
                        outlined
                        stack-label
                        type="textarea"
                        :rows="4"
                        label="Descripción"
                        class="admin-q-field admin-q-field--textarea"
                      />
                    </div>
                    <div class="col-12 admin-field-wrap">
                      <div class="text-body2 text-weight-medium q-mb-xs">URLs de imágenes</div>
                      <p class="text-caption text-grey-7 q-mt-none q-mb-sm">
                        Orden = carrusel en la ficha. Añade o quita filas con los botones.
                      </p>
                      <div
                        v-for="(urlLine, idx) in imageUrlLines[p.id] ?? ['']"
                        :key="`${p.id}-img-${idx}`"
                        class="row q-col-gutter-sm q-mb-sm items-start admin-url-row"
                      >
                        <q-input
                          class="col"
                          outlined
                          dense
                          :model-value="urlLine"
                          placeholder="https://…"
                          type="text"
                          @update:model-value="(v) => draft.setImageUrlLine(p.id, idx, v)"
                        />
                        <div class="col-auto flex flex-center admin-url-actions">
                          <q-btn
                            outline
                            dense
                            no-caps
                            color="grey-7"
                            icon="fa-solid fa-trash-can"
                            label="Eliminar"
                            :disable="(imageUrlLines[p.id] ?? ['']).length <= 1"
                            @click="draft.removeImageUrlLine(p.id, idx)"
                          />
                        </div>
                      </div>
                      <q-btn
                        outline
                        dense
                        no-caps
                        color="grey-8"
                        icon="fa-solid fa-plus"
                        label="Agregar"
                        class="q-mt-xs"
                        @click="draft.addImageUrlLine(p.id)"
                      />
                    </div>
                    <div class="col-12 col-sm-6 admin-field-wrap">
                      <q-input
                        v-model="p.measure"
                        outlined
                        stack-label
                        label="Medida / detalle corto"
                        class="admin-q-field"
                      />
                    </div>
                    <div class="col-12 col-sm-6 admin-field-wrap">
                      <q-input
                        :model-value="p.discount ?? ''"
                        outlined
                        stack-label
                        label="Descuento (texto, ej. 10%)"
                        clearable
                        class="admin-q-field"
                        @update:model-value="(v: string | number | null) => (p.discount = v ? String(v) : null)"
                      />
                    </div>
                    <div class="col-12 admin-field-wrap">
                      <q-input
                        v-model="tagInputs[p.id]"
                        outlined
                        stack-label
                        label="Etiquetas (separadas por coma)"
                        class="admin-q-field"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </q-list>

      <p v-if="sourceReady && filtered.length === 0" class="text-grey-7 q-mt-md">Sin resultados.</p>
      <p v-if="!sourceReady && !loadingDraft" class="text-negative q-mt-md">
        No se pudo cargar el catálogo. Revisa la red o la configuración de Sheets / remoto.
      </p>

      <q-dialog v-model="addProductDialogOpen" persistent>
        <q-card style="min-width: 320px; max-width: 480px">
          <q-card-section class="text-h6">Agregar producto</q-card-section>
          <q-card-section class="q-gutter-md q-pt-none">
            <q-input v-model="newProductId" outlined stack-label label="ID (slug único)" dense />
            <q-select
              v-model="newProductCategory"
              :options="categorySelectOptions"
              option-value="value"
              option-label="label"
              emit-value
              map-options
              outlined
              stack-label
              label="Categoría"
              dense
            />
            <q-input v-model="newProductName" outlined stack-label label="Nombre" dense />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat no-caps label="Cancelar" v-close-popup />
            <q-btn color="dark" unelevated no-caps label="Agregar" @click="submitNewProduct" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { Dialog, Notify } from 'quasar'
import type { Product } from 'src/types'
import { usePageSeo } from 'src/composables/usePageSeo'
import { buildFullAdminExport } from 'src/utils/adminCatalogStorage'
import { getRawCatalogJson, type RawCategory } from 'src/utils/catalogData'
import {
  categoriesToCsvString,
  productsToCsvString,
  triggerCsvDownload,
} from 'src/utils/catalogCsvExport'
import { ADMIN_CATALOG_SORT_OPTIONS } from 'src/utils/catalogSort'
import { slugifyCatalogText } from 'src/utils/slugify'
import { useAdminCatalogDraftStore } from 'src/stores/admin-catalog-draft-store'

usePageSeo({
  title: 'Admin catálogo',
  description: 'Panel de administración MVP.',
  path: '/admin/catalogo',
  noIndex: true,
})

const draft = useAdminCatalogDraftStore()
const {
  filtered,
  loadingDraft,
  sourceReady,
  filter,
  sortMode,
  tagInputs,
  imageUrlLines,
  products,
  baseProductsSnapshot,
  catalogSlug,
  catalogSlugsLabel,
  categorySelectOptions,
} = storeToRefs(draft)

const addProductDialogOpen = ref(false)
const newProductId = ref('')
const newProductCategory = ref('')
const newProductName = ref('Nuevo producto')
const expandedProductId = ref<string | null>(null)

function onExpansionUpdate(id: string, open: boolean) {
  if (open) expandedProductId.value = id
  else if (expandedProductId.value === id) expandedProductId.value = null
}

onMounted(() => {
  if (!sourceReady.value && !loadingDraft.value) {
    void draft.loadDraft()
  }
})

function formatListPrice(p: Product): string {
  const code = (p.currency || 'GTQ').toUpperCase()
  try {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: code }).format(p.price)
  } catch {
    return `${p.price} ${code}`
  }
}

function listMeasureLabel(p: Product): string {
  const m = (p.measure ?? '').trim()
  return m || '—'
}

function openAddProductDialog() {
  const opts = categorySelectOptions.value
  newProductId.value = `nuevo-${Date.now()}`
  newProductCategory.value = opts[0]?.value ?? ''
  newProductName.value = 'Nuevo producto'
  addProductDialogOpen.value = true
}

function submitNewProduct() {
  const id = newProductId.value.trim()
  if (!id) {
    Notify.create({ type: 'warning', message: 'El ID es obligatorio' })
    return
  }
  if (products.value.some((x: Product) => x.id === id)) {
    Notify.create({ type: 'warning', message: 'Ya existe un producto con ese ID' })
    return
  }
  const catSlug =
    newProductCategory.value.trim() ||
    categorySelectOptions.value[0]?.value ||
    'sin-categoria'
  const cat = draft.lastResolvedRaw?.categories.find((c: RawCategory) => c.slug === catSlug)
  const name = newProductName.value.trim() || 'Nuevo producto'
  const maxOrder = products.value.reduce((m: number, x: Product) => Math.max(m, x.order), 0)
  const currency = draft.lastResolvedRaw?.currency ?? 'GTQ'

  const p: Product = {
    id,
    name,
    slug: `${slugifyCatalogText(name)}-${id}`,
    description: '',
    price: 0,
    currency,
    images: [],
    categoryId: catSlug,
    categoryName: cat?.name ?? catSlug,
    tags: [],
    available: true,
    visible: true,
    order: maxOrder + 1,
  }

  draft.appendDraftProduct(p)
  addProductDialogOpen.value = false

  const categoryLabel = cat?.name ?? catSlug
  const q = filter.value.trim().toLowerCase()
  if (
    q &&
    !id.toLowerCase().includes(q) &&
    !name.toLowerCase().includes(q) &&
    !categoryLabel.toLowerCase().includes(q)
  ) {
    filter.value = ''
  }

  expandedProductId.value = id
  void nextTick(() => {
    document.getElementById(`admin-product-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })

  Notify.create({
    type: 'positive',
    message: 'Producto añadido al borrador',
    caption: 'Exportá CSV u overlay JSON para persistirlo en la fuente (Sheet/repo).',
    timeout: 5000,
  })
}

function confirmRemoveProduct(p: Product) {
  Dialog.create({
    title: 'Eliminar producto',
    message: `¿Quitar «${p.name}» (${p.id}) de la lista? Si exportas JSON, usa apply-overlay para reflejar la baja en el repo.`,
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true, noCaps: true },
    persistent: true,
  }).onOk(() => {
    if (expandedProductId.value === p.id) expandedProductId.value = null
    draft.removeDraftProduct(p.id)
    Notify.create({ type: 'info', message: 'Producto quitado del borrador' })
  })
}

function exportJson() {
  if (!sourceReady.value) return
  draft.syncDraftInputsToProducts()
  const payload = buildFullAdminExport(products.value, baseProductsSnapshot.value)
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${catalogSlug.value}-admin-overlay-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  Notify.create({ type: 'info', message: 'Descarga del overlay JSON iniciada' })
}

function exportCsvProducts() {
  if (!sourceReady.value) return
  draft.syncDraftInputsToProducts()
  const slug = catalogSlug.value
  const csv = productsToCsvString(products.value)
  triggerCsvDownload(`${slug}-products-${Date.now()}.csv`, csv)
  Notify.create({ type: 'info', message: 'CSV de productos descargado (vista actual del admin)' })
}

function exportCsvCategories() {
  const slug = catalogSlug.value
  const raw = draft.lastResolvedRaw ?? getRawCatalogJson(slug)
  if (!raw) {
    Notify.create({ type: 'negative', message: 'No hay datos de categorías (recarga el admin)' })
    return
  }
  const csv = categoriesToCsvString(raw.categories ?? [])
  triggerCsvDownload(`${slug}-categories-${Date.now()}.csv`, csv)
  Notify.create({ type: 'info', message: 'CSV de categorías descargado (desde JSON empaquetado)' })
}

function exportCsvSheetsBundle() {
  if (!sourceReady.value) return
  draft.syncDraftInputsToProducts()
  const slug = catalogSlug.value
  triggerCsvDownload(`${slug}-products-${Date.now()}.csv`, productsToCsvString(products.value))
  const raw = draft.lastResolvedRaw ?? getRawCatalogJson(slug)
  if (!raw) {
    Notify.create({
      type: 'warning',
      message: 'Productos descargados; no hay JSON empaquetado para categorías en este slug',
    })
    return
  }
  window.setTimeout(() => {
    triggerCsvDownload(`${slug}-categories-${Date.now()}.csv`, categoriesToCsvString(raw.categories ?? []))
    Notify.create({ type: 'positive', message: 'Listo: CSV de productos y categorías' })
  }, 400)
}
</script>

<style scoped lang="scss">
.admin-authed-wrap {
  position: relative;
  min-height: 240px;
}

.admin-page {
  max-width: 1120px;
  margin: 0 auto;
  padding-bottom: 3rem;
}

@media (min-width: 1024px) {
  .admin-page {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

.admin-banner {
  margin-bottom: 1.5rem;
  padding: 14px 18px;
}

.admin-toolbar-card {
  background: #fff;
  border-radius: 12px;
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.admin-toolbar-inner {
  padding: 14px 16px;

  @media (min-width: 1024px) {
    padding: 12px 18px;
  }

  > .row > [class*='col-'] {
    min-width: 0;
  }
}

/* Misma altura del área de control que los botones (40px) + alineación inferior en la fila. */
.admin-toolbar-field-col {
  :deep(.q-field__control) {
    min-height: 40px;
  }

  :deep(.q-field__native) {
    min-height: 40px;
  }
}

.admin-toolbar-actions-col {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  @media (max-width: 1023px) {
    padding-top: 2px;
  }
}

.admin-toolbar-sep {
  flex-shrink: 0;
  align-self: center;
}

.admin-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;

  @media (min-width: 1024px) {
    flex-wrap: nowrap;
    justify-content: flex-end;
  }

  /* Misma altura y tipografía entre q-btn y q-btn-dropdown. */
  :deep(.admin-toolbar-btn.q-btn),
  :deep(.admin-toolbar-dropdown .q-btn) {
    min-height: 40px;
    padding-left: 14px;
    padding-right: 14px;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25;
  }

  :deep(.admin-toolbar-dropdown .q-btn-dropdown__arrow) {
    font-size: 1rem;
    margin-left: 4px;
  }

  /* Menos hueco entre icono y texto (Quasar suele meter ~8px en .on-left). */
  :deep(.admin-toolbar-btn.q-btn .q-btn__content),
  :deep(.admin-toolbar-dropdown .q-btn .q-btn__content) {
    gap: 5px;
  }

  :deep(.admin-toolbar-btn.q-btn .on-left),
  :deep(.admin-toolbar-dropdown .q-btn .on-left) {
    margin-right: 0 !important;
  }

  :deep(.admin-toolbar-btn.q-btn .q-icon.on-left),
  :deep(.admin-toolbar-dropdown .q-btn .q-icon.on-left) {
    font-size: 1rem;
  }
}

.admin-toolbar-btn {
  flex-shrink: 0;
}

.admin-filter-input,
.admin-sort-select {
  margin-bottom: 0;
}

.admin-list {
  background: #fff;
  overflow: hidden;
}

.admin-expansion-item {
  .admin-header-avatar {
    min-width: 52px;
  }

  .admin-header-thumb {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    object-fit: cover;
    display: block;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #ececf0;
  }

  .admin-header-thumb-fallback {
    font-size: 1.35rem;
    padding: 10px;
    opacity: 0.75;
  }

  :deep(.q-item) {
    min-height: 56px;
    padding: 14px 20px;
  }

  :deep(.q-item__label) {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.35;
  }

  :deep(.q-item__label--caption) {
    margin-top: 4px;
    font-size: 0.8rem;
  }

  .admin-list-title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }

  .admin-list-title-text {
    min-width: 0;
  }

  .admin-draft-only-badge {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    padding: 3px 8px;
  }

  .admin-list-price-measure {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 2px;
    margin-top: 2px;
  }

  .admin-list-measure {
    font-weight: 500;
  }
}

.admin-expansion-card {
  background: #f5f5f7;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.admin-form-section {
  padding: 1.75rem 1.5rem 2rem;

  @media (min-width: 768px) {
    padding: 2rem 2rem 2.25rem;
  }
}

.admin-form-grid {
  align-items: flex-start;
}

.admin-fields-grid {
  align-items: flex-start;
}

.admin-field-wrap {
  margin-bottom: 0.25rem;
}

.admin-toggle-wrap {
  min-height: 52px;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.admin-image-block {
  position: sticky;
  top: 1rem;
}

.admin-image-main {
  aspect-ratio: 1;
  max-height: 320px;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.admin-img-main {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.admin-image-placeholder {
  width: 100%;
  height: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 0.9rem;
  background: #ececf0;
}

.admin-thumb-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.admin-thumb {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.admin-image-hint {
  line-height: 1.45;
  max-width: 280px;
}

.admin-q-field--textarea :deep(textarea.q-field__native) {
  min-height: 112px;
  line-height: 1.5;
}
</style>
