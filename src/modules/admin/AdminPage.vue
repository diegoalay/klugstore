<template>
  <q-layout view="hHh lpR fFf" class="admin-layout">
    <q-header elevated class="admin-header">
      <q-toolbar>
        <q-toolbar-title>Admin · catálogo (MVP)</q-toolbar-title>
        <q-btn v-if="authed" flat no-caps label="Tienda" to="/catalog" />
        <q-btn v-if="authed" flat no-caps label="Salir" @click="logout" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page padding class="admin-page">
        <q-card v-if="!authed" flat bordered class="login-card">
          <q-card-section>
            <div class="text-h6">Acceso</div>
            <p class="text-caption text-grey-7 q-mb-md">
              Usuario: <strong>{{ ADMIN_USERNAME }}</strong> · Contraseña por defecto en desarrollo:
              <code>sweethome</code> (o <code>VITE_ADMIN_PASSWORD</code> en <code>.env</code>).
            </p>
          </q-card-section>
          <q-card-section class="q-gutter-md">
            <q-input v-model="user" outlined stack-label label="Usuario" autocomplete="username" />
            <q-input
              v-model="pass"
              outlined
              stack-label
              type="password"
              label="Contraseña"
              autocomplete="current-password"
              @keyup.enter="login"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn color="dark" unelevated label="Entrar" @click="login" />
          </q-card-actions>
        </q-card>

        <template v-else>
          <q-banner rounded class="bg-amber-2 text-dark admin-banner">
            <strong>Tienda activa:</strong> <code>{{ catalogSlug }}</code>
            (subdominio / <code>DOMAIN_MAP</code> en <code>storeResolver.ts</code> + JSON en
            <code>data/products/</code>). En local: <code>sweethome.localhost</code> o
            <code>{slug}.klugstore.app</code>.<br />
            <strong>El navegador no puede escribir</strong> en el JSON del repo: los cambios van a
            <strong>localStorage</strong>. Para volcar al disco: <strong>Exportar JSON</strong> y
            <code>npm run catalog:apply-overlay -- ruta/archivo.json</code> (o
            <code>STORE_SLUG=&lt;slug&gt; npm run catalog:apply-overlay</code> con el export por
            defecto <code>&lt;slug&gt;-admin-overlay.json</code> en la raíz). Slugs en este build:
            <code>{{ catalogSlugsLabel }}</code>. En build usa
            <code>VITE_ADMIN_PASSWORD</code>; luego klugsystem.
          </q-banner>

          <div class="row q-col-gutter-md admin-toolbar q-mb-lg items-end">
            <div class="col-12 col-md-6">
              <q-input
                v-model="filter"
                outlined
                stack-label
                clearable
                label="Buscar por id, nombre o categoría"
                class="admin-filter-input"
              />
            </div>
            <div class="col-12 col-md-6 flex q-gutter-sm justify-end flex-wrap">
              <q-btn outline color="grey-8" label="Exportar JSON" @click="exportJson" />
              <q-btn outline color="negative" label="Quitar overrides locales" @click="resetLocal" />
              <q-btn color="dark" unelevated label="Guardar" :loading="saving" @click="saveCatalog" />
            </div>
          </div>

          <q-list bordered separator class="admin-list rounded-borders">
            <q-expansion-item
              v-for="p in filtered"
              :key="p.id"
              expand-separator
              class="admin-expansion-item"
              :label="p.name"
              :caption="`${p.id} · ${p.categoryName ?? ''}`"
            >
              <q-card flat class="admin-expansion-card">
                <q-card-section class="admin-form-section">
                  <div class="row q-col-gutter-lg admin-form-grid">
                    <div class="col-12 col-md-4">
                      <div class="admin-image-block">
                        <div class="admin-image-main">
                          <img
                            v-if="previewPrimaryUrl(p)"
                            :src="String(previewPrimaryUrl(p))"
                            :alt="p.name"
                            class="admin-img-main"
                          />
                          <div v-else class="admin-image-placeholder">Sin imagen</div>
                        </div>
                        <div v-if="previewImageUrls(p).length > 1" class="admin-thumb-strip">
                          <img
                            v-for="(url, idx) in previewImageUrls(p)"
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
                          <q-input
                            v-model="imageUrlInputs[p.id]"
                            outlined
                            stack-label
                            type="textarea"
                            :rows="5"
                            label="URLs de imágenes (una por línea)"
                            hint="Orden = carrusel en la ficha del producto"
                            class="admin-q-field admin-q-field--textarea"
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

          <p v-if="filtered.length === 0" class="text-grey-7 q-mt-md">Sin resultados.</p>
        </template>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Notify } from 'quasar'
import type { Product } from 'src/types'
import { usePageSeo } from 'src/composables/usePageSeo'
import { useCatalog } from 'src/composables/useCatalog'
import { getMergedCatalogProducts, getBaseCatalogProductsWithoutOverlay } from 'src/mocks/catalog.mock'
import {
  saveAdminCatalogOverlay,
  clearAdminCatalogOverlay,
  buildAdminOverlayFromDraft,
  isAdminSessionActive,
  setAdminSession,
} from 'src/utils/adminCatalogStorage'
import { tryAdminLogin, ADMIN_USERNAME } from 'src/utils/adminAuth'
import { resolveCatalogSlug, listCatalogSlugs } from 'src/utils/catalogData'

const catalogSlug = computed(() => resolveCatalogSlug())
const catalogSlugsLabel = computed(() => listCatalogSlugs().join(', ') || '—')

usePageSeo({
  title: 'Admin catálogo',
  description: 'Panel de administración MVP.',
  path: '/admin',
  noIndex: true,
})

const { loadCatalog } = useCatalog()

const authed = ref(false)
const user = ref('')
const pass = ref('')
const filter = ref('')
const products = ref<Product[]>([])
const tagInputs = ref<Record<string, string>>({})
const imageUrlInputs = ref<Record<string, string>>({})
const saving = ref(false)

/** URLs según el textarea (si existe) o las imágenes del producto en memoria. */
function previewImageUrls(p: Product): string[] {
  const raw = imageUrlInputs.value[p.id]
  if (raw !== undefined) {
    return raw.split('\n').map((s) => s.trim()).filter(Boolean)
  }
  return (p.images ?? []).map((i) => i.url)
}

function previewPrimaryUrl(p: Product): string | undefined {
  return previewImageUrls(p)[0]
}

function syncDraftInputsToProducts() {
  for (const p of products.value) {
    const t = tagInputs.value[p.id]
    if (t !== undefined) {
      p.tags = t.split(',').map((s) => s.trim()).filter(Boolean)
    }
    const imgBlock = imageUrlInputs.value[p.id]
    if (imgBlock !== undefined) {
      const urls = imgBlock.split('\n').map((s) => s.trim()).filter(Boolean)
      p.images = urls.map((url, i) => ({
        url,
        alt: p.name,
        order: i + 1,
      }))
    }
  }
}

function cloneProducts(list: Product[]): Product[] {
  return JSON.parse(JSON.stringify(list)) as Product[]
}

function loadDraft() {
  products.value = cloneProducts(getMergedCatalogProducts(catalogSlug.value))
  const ti: Record<string, string> = {}
  const ii: Record<string, string> = {}
  for (const p of products.value) {
    ti[p.id] = (p.tags ?? []).join(', ')
    ii[p.id] = (p.images ?? []).map((i) => i.url).join('\n')
  }
  tagInputs.value = ti
  imageUrlInputs.value = ii
}

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return products.value
  return products.value.filter(
    (p) =>
      p.id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(q)),
  )
})

onMounted(() => {
  authed.value = isAdminSessionActive()
  if (authed.value) loadDraft()
})

function login() {
  if (!tryAdminLogin(user.value, pass.value)) {
    Notify.create({ type: 'negative', message: 'Usuario o contraseña incorrectos' })
    return
  }
  setAdminSession(true)
  authed.value = true
  pass.value = ''
  loadDraft()
}

function logout() {
  setAdminSession(false)
  authed.value = false
  products.value = []
  tagInputs.value = {}
  imageUrlInputs.value = {}
}

async function saveCatalog() {
  syncDraftInputsToProducts()
  const overlay = buildAdminOverlayFromDraft(
    products.value,
    getBaseCatalogProductsWithoutOverlay(catalogSlug.value),
  )
  saving.value = true
  try {
    saveAdminCatalogOverlay(catalogSlug.value, overlay)
    await loadCatalog(catalogSlug.value)
    Notify.create({ type: 'positive', message: 'Cambios guardados en este navegador' })
  } finally {
    saving.value = false
  }
}

async function resetLocal() {
  clearAdminCatalogOverlay(catalogSlug.value)
  await loadCatalog(catalogSlug.value)
  loadDraft()
  Notify.create({ type: 'info', message: 'Overrides locales eliminados' })
}

function exportJson() {
  syncDraftInputsToProducts()
  const overlay = buildAdminOverlayFromDraft(
    products.value,
    getBaseCatalogProductsWithoutOverlay(catalogSlug.value),
  )
  const blob = new Blob([JSON.stringify({ v: 1, products: overlay }, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${catalogSlug.value}-admin-overlay-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  Notify.create({ type: 'info', message: 'Descarga iniciada' })
}
</script>

<style scoped lang="scss">
.admin-layout {
  background: #e8e8ea;
}

.admin-header {
  background: #1a1a2e;
  color: #fff;
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

.admin-toolbar {
  padding-top: 0.25rem;
}

.admin-filter-input {
  margin-bottom: 0;
}

.login-card {
  max-width: 420px;
  margin: 48px auto;
  background: #fff;
}

.admin-list {
  background: #fff;
  overflow: hidden;
}

.admin-expansion-item {
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

/* stack-label: la etiqueta va arriba; altura mínima cómoda en textareas */
.admin-q-field--textarea :deep(textarea.q-field__native) {
  min-height: 112px;
  line-height: 1.5;
}
</style>
