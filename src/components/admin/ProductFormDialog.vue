<template>
  <q-dialog v-model="open" :maximized="$q.screen.lt.sm" transition-show="scale" transition-hide="scale">
    <q-card class="form-card">
      <div class="form-header">
        <div class="form-header-text">
          <div class="form-eyebrow">{{ isEdit ? 'Editar producto' : 'Producto nuevo' }}</div>
          <div class="form-title">{{ draft.name || 'Sin nombre' }}</div>
        </div>
        <q-btn round flat icon="fa-solid fa-xmark" color="grey-7" class="admin-btn-sm" @click="close" />
      </div>

      <div class="form-body">
        <section class="form-media">
          <div class="form-section-label">Fotos</div>
          <ProductImageManager
            :images="draft.images"
            :store-slug="storeSlug"
            :product-id="workingId"
            :product-name="draft.name || 'producto'"
            @update:images="(imgs) => (draft.images = imgs)"
          />

          <div class="form-status">
            <q-toggle v-model="draft.visible" dense label="Visible en la tienda" color="positive" />
            <q-toggle v-model="draftSold" dense label="Vendido" color="deep-orange-6" />
          </div>

          <div v-if="isEdit && draft.source?.type === 'instagram'" class="form-ig">
            <div class="form-ig-head">
              <q-icon name="fa-brands fa-instagram" size="14px" />
              <span>Publicación de Instagram</span>
              <a :href="draft.source.url" target="_blank" rel="noopener noreferrer">Ver</a>
            </div>
            <q-btn
              outline
              no-caps
              no-wrap
              color="dark"
              icon="fa-solid fa-arrows-rotate"
              label="Actualizar publicación en Instagram"
              class="admin-btn form-ig-btn"
              :loading="igCaption === undefined"
              :disable="igCaption === null"
              @click="prepareInstagramUpdate"
            />
            <p class="form-ig-hint">
              Copia el texto con lo de este formulario (descripción, medidas, precio y vendido) y abre la publicación: en Instagram toca
              <strong>··· › Editar</strong>, pega y guarda.
            </p>
          </div>
        </section>

        <section class="form-info">
          <div class="form-section-label">Información</div>
          <div class="form-grid">
            <q-input v-model="draft.name" outlined dense label="Nombre" class="form-field span-2" autofocus />

            <q-input
              v-model.number="draft.price"
              outlined
              dense
              type="number"
              step="0.01"
              prefix="Q"
              label="Precio"
              class="form-field"
            />
            <q-select
              v-model="draft.categoryId"
              :options="categoryOptionsWithNew"
              option-value="value"
              option-label="label"
              emit-value
              map-options
              outlined
              dense
              label="Categoría"
              class="form-field"
              @update:model-value="onCategorySelected"
            />

            <q-input
              v-model="draft.description"
              outlined
              dense
              type="textarea"
              autogrow
              label="Descripción"
              class="form-field form-description span-2"
            />

            <q-input v-model="draftMeasure" outlined dense label="Medida" class="form-field" />
            <q-input v-model="draftDiscount" outlined dense label="Descuento (ej. 10%)" clearable class="form-field" />

            <q-input v-model="draftStock" outlined dense type="number" label="Stock" clearable class="form-field" />
            <q-input v-model="draftTags" outlined dense label="Etiquetas (separadas por coma)" class="form-field" />

            <q-input
              v-if="!isEdit"
              v-model="workingId"
              outlined
              dense
              label="ID interno (se genera solo)"
              class="form-field span-2"
              @update:model-value="onWorkingIdInput"
            />
          </div>
        </section>
      </div>

      <div class="form-footer">
        <q-btn
          v-if="isEdit"
          flat
          no-caps
          color="negative"
          icon="fa-solid fa-trash-can"
          :label="$q.screen.lt.sm ? undefined : 'Eliminar'"
          :round="$q.screen.lt.sm"
          class="admin-btn"
          :disable="saving"
          @click="emit('request-delete')"
        >
          <q-tooltip v-if="$q.screen.lt.sm">Eliminar</q-tooltip>
        </q-btn>
        <q-space />
        <q-btn
          unelevated
          no-caps
          color="dark"
          class="admin-btn form-save-btn"
          :label="isEdit ? 'Guardar cambios' : 'Crear producto'"
          icon="fa-solid fa-floppy-disk"
          :loading="saving"
          @click="submit"
        />
      </div>
    </q-card>

    <q-dialog v-model="igConfirmOpen">
      <q-card class="ig-confirm">
        <div class="ig-confirm-head">
          <div>
            <div class="form-eyebrow">Instagram</div>
            <div class="ig-confirm-title">Actualizar la publicación</div>
          </div>
          <q-btn round flat icon="fa-solid fa-xmark" color="grey-7" class="admin-btn-sm" v-close-popup />
        </div>
        <div class="ig-confirm-body">
          <ul class="ig-confirm-changes">
            <li v-for="c in igUpdate.changes" :key="c">
              <q-icon name="fa-solid fa-check" size="11px" /> {{ c }}
            </li>
          </ul>
          <div class="ig-confirm-label">Texto actual en Instagram</div>
          <pre class="ig-confirm-preview ig-confirm-preview--current">{{ igUpdate.current }}</pre>
          <div class="ig-confirm-label">
            <q-icon name="fa-solid fa-arrow-down" size="10px" /> Texto nuevo (el que vas a pegar)
          </div>
          <pre class="ig-confirm-preview">{{ igUpdate.caption }}</pre>
          <p class="form-ig-hint">
            Al confirmar se copia el texto y se abre la publicación. En Instagram toca <strong>··· › Editar</strong>,
            pega y guarda.
          </p>
        </div>
        <div class="form-footer">
          <q-space />
          <q-btn
            unelevated
            no-caps
            color="dark"
            icon="fa-brands fa-instagram"
            label="Copiar y abrir Instagram"
            class="admin-btn form-save-btn"
            @click="confirmInstagramUpdate"
          />
        </div>
      </q-card>
    </q-dialog>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useQuasar, Notify, Dialog, copyToClipboard } from 'quasar'
import type { Product } from '@/types'
import { slugifyCatalogText, productSlug } from '@/utils/slugify'
import { useAdminFirestoreCatalogStore } from '@/stores/admin-firestore-catalog-store'
import ProductImageManager from '@/components/admin/ProductImageManager.vue'
import { nextProductId, persistExternalImages } from '@/utils/productImages'
import { updateCaptionForProduct } from '@/utils/instagramCaption'
import { useAdminInstagramStore } from '@/stores/admin-instagram-store'

const NEW_CATEGORY_VALUE = '__new_category__'

const $q = useQuasar()
const store = useAdminFirestoreCatalogStore()

const props = defineProps<{
  modelValue: boolean
  product?: Product | null
  /** Valores iniciales al crear (p. ej. desde un post de Instagram). */
  prefill?: Partial<Product> | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: [productId: string]
  'request-delete': []
}>()

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const isEdit = computed(() => !!props.product)
const storeSlug = computed(() => store.catalogSlug)
const categoryOptionsWithNew = computed(() => [
  ...store.categorySelectOptions,
  { value: NEW_CATEGORY_VALUE, label: '+ Nueva categoría' },
])

function blankDraft(): Product {
  return {
    id: '',
    name: '',
    slug: '',
    description: '',
    price: 0,
    currency: 'GTQ',
    images: [],
    categoryId: store.categorySelectOptions[0]?.value ?? '',
    categoryName: '',
    tags: [],
    available: true,
    visible: true,
    order: 0,
  }
}

const draft = reactive<Product>(blankDraft())
const workingId = ref('')
const saving = ref(false)
const previousCategoryId = ref('')

const draftSold = computed({
  get: () => !!draft.sold,
  set: (v: boolean) => (draft.sold = v),
})
const draftMeasure = computed({
  get: () => draft.measure ?? '',
  set: (v: string) => {
    if (v) draft.measure = v
    else delete draft.measure
  },
})
const draftDiscount = computed({
  get: () => draft.discount ?? '',
  set: (v: string | null) => (draft.discount = v || null),
})
const draftStock = computed({
  get: () => (typeof draft.stock === 'number' ? String(draft.stock) : ''),
  set: (v: string | number | null) => {
    if (v === '' || v === null) delete draft.stock
    else draft.stock = Number(v)
  },
})
const draftTags = computed({
  get: () => (draft.tags ?? []).join(', '),
  set: (v: string) =>
    (draft.tags = v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)),
})

/** Reemplaza el borrador completo: sin esto quedaban campos del producto anterior (sold, source…). */
function resetDraft(next: Product) {
  for (const key of Object.keys(draft) as (keyof Product)[]) delete draft[key]
  Object.assign(draft, next, { images: next.images.map((i) => ({ ...i })) })
}

// Al crear, el ID sigue el esquema de la base `{categoría}-{nn}` (editable a mano).
let idWasEdited = false
function autoId() {
  return draft.categoryId ? nextProductId(draft.categoryId, store.products.map((p) => p.id)) : ''
}

watch(
  () => [props.modelValue, props.product] as const,
  ([isOpen, product]) => {
    if (!isOpen) return
    if (product) {
      resetDraft(product)
      workingId.value = product.id
    } else {
      resetDraft({ ...blankDraft(), ...(props.prefill ?? {}) })
      idWasEdited = false
      workingId.value = autoId()
    }
    previousCategoryId.value = draft.categoryId
  },
  { immediate: true },
)

function onWorkingIdInput() {
  idWasEdited = true
}

watch(
  () => draft.categoryId,
  () => {
    if (!isEdit.value && !idWasEdited) workingId.value = autoId()
  },
)

function close() {
  open.value = false
}

// Texto actual del post de Instagram (undefined = cargando, null = no disponible).
// Se carga al abrir para que el clic copie y abra sin esperar la red: los navegadores
// bloquean portapapeles y pestañas nuevas si no ocurren justo después del clic.
const igStore = useAdminInstagramStore()
const igCaption = ref<string | null | undefined>(null)

watch(
  () => [props.modelValue, draft.source?.postId] as const,
  async ([isOpen, postId]) => {
    if (!isOpen || !postId) {
      igCaption.value = null
      return
    }
    igCaption.value = undefined
    try {
      igCaption.value = (await igStore.fetchPost(postId))?.caption ?? null
    } catch {
      igCaption.value = null
    }
  },
  { immediate: true },
)

const igConfirmOpen = ref(false)
const igUpdate = reactive({ current: '', caption: '', changes: [] as string[] })

/** Calcula el texto nuevo y lo que cambia; si hay cambios, pide confirmación. */
function prepareInstagramUpdate() {
  if (typeof igCaption.value !== 'string') return
  const { caption, changed, changes } = updateCaptionForProduct(igCaption.value, {
    sold: !!draft.sold,
    price: Number(draft.price) || 0,
    description: draft.description,
    measure: draft.measure ?? null,
  })
  if (!changed) {
    Notify.create({ message: 'La publicación ya está al día con este producto.' })
    return
  }
  igUpdate.current = igCaption.value
  igUpdate.caption = caption
  igUpdate.changes = changes
  igConfirmOpen.value = true
}

function confirmInstagramUpdate() {
  const url = draft.source?.url
  if (!url) return
  igConfirmOpen.value = false
  window.open(url, '_blank', 'noopener')
  void copyToClipboard(igUpdate.caption)
    .then(() =>
      Notify.create({
        type: 'positive',
        message: 'Texto copiado. En Instagram: ··· › Editar, pega y guarda.',
        timeout: 6000,
      }),
    )
    .catch(() => Notify.create({ type: 'negative', message: 'No se pudo copiar el texto' }))
}

async function createCategoryFromPrompt(name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    draft.categoryId = previousCategoryId.value
    return
  }
  const slug = slugifyCatalogText(trimmed)
  try {
    await store.saveCategory({ slug, name: trimmed, icon: 'tag', order: store.categories.length + 1 })
    draft.categoryId = slug
    previousCategoryId.value = slug
    Notify.create({ type: 'positive', message: `Categoría "${trimmed}" creada` })
  } catch (err) {
    console.error(err)
    draft.categoryId = previousCategoryId.value
    Notify.create({ type: 'negative', message: 'No se pudo crear la categoría' })
  }
}

function onCategorySelected(value: string) {
  if (value !== NEW_CATEGORY_VALUE) {
    previousCategoryId.value = value
    return
  }
  Dialog.create({
    title: 'Nueva categoría',
    message: 'Nombre de la categoría',
    prompt: { model: '', type: 'text' },
    cancel: true,
    persistent: true,
  })
    .onOk((name: string) => void createCategoryFromPrompt(name))
    .onCancel(() => {
      draft.categoryId = previousCategoryId.value
    })
}

async function submit() {
  if (!draft.name.trim()) {
    Notify.create({ type: 'warning', message: 'Ponle un nombre al producto' })
    return
  }
  if (!isEdit.value && !workingId.value.trim()) {
    Notify.create({ type: 'warning', message: 'Falta el ID interno' })
    return
  }
  if (!isEdit.value && store.products.some((p) => p.id === workingId.value.trim())) {
    Notify.create({ type: 'warning', message: 'Ya existe un producto con ese ID' })
    return
  }

  const cat = store.categories.find((c) => c.slug === draft.categoryId)
  draft.categoryName = cat?.name ?? draft.categoryId
  draft.slug = productSlug(draft.name, workingId.value || draft.id)

  saving.value = true
  try {
    const id = (isEdit.value ? workingId.value : workingId.value.trim()) || draft.id
    draft.images = await persistExternalImages(draft.images, storeSlug.value, id)
    if (isEdit.value) {
      draft.id = id
      await store.saveProduct({ ...draft })
    } else {
      await store.createProduct(id, { ...draft, id })
    }
    Notify.create({ type: 'positive', message: isEdit.value ? 'Cambios guardados' : 'Producto creado' })
    emit('saved', id)
  } catch (err) {
    console.error(err)
    const reason = err instanceof Error && err.message ? `: ${err.message}` : ''
    Notify.create({ type: 'negative', message: `No se pudo guardar${reason}` })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.form-card {
  width: 100%;
  max-width: 940px;
  max-height: 92vh;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

// En mobile el diálogo ocupa toda la pantalla: el cuerpo se estira y el pie
// queda pegado abajo (antes el cuerpo tenía alto fijo y sobraba espacio).
.q-dialog__inner--maximized .form-card {
  max-height: none;
  height: 100%;
  border-radius: 0;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.form-header-text {
  min-width: 0;
}

.form-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d19793;
}

.form-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #000;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: #faf8f5;
  padding: 24px;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 32px;
  align-items: start;
}

.form-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8a8a8a;
  margin-bottom: 10px;
}

.form-status {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
}

.ig-confirm {
  width: 100%;
  max-width: 520px;
  border-radius: 20px;
  overflow: hidden;
}

.ig-confirm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.ig-confirm-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: 2px;
}

.ig-confirm-body {
  padding: 18px 24px;
  background: #faf8f5;
}

.ig-confirm-preview--current {
  background: #f1efec;
  color: #8a8a8a;
  border-style: dashed;
}

.ig-confirm-changes {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 2px 0;

    .q-icon {
      color: #21ba45;
    }
  }
}

.ig-confirm-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8a8a8a;
  margin-bottom: 6px;
}

.ig-confirm-preview {
  margin: 0 0 14px;
  max-height: 180px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 0.85rem;
  line-height: 1.5;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 12px 14px;
}

.form-ig {
  margin-top: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
}

.form-ig-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 10px;

  a {
    margin-left: auto;
    color: #000;
    font-weight: 600;
  }
}

.form-ig-btn {
  width: 100%;
  font-size: 0.82rem;

  :deep(.q-icon) {
    font-size: 13px;
    margin-right: 8px;
  }
}

.form-ig-hint {
  margin: 8px 0 0;
  font-size: 0.72rem;
  color: #8a8a8a;
  line-height: 1.4;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.span-2 {
  grid-column: 1 / -1;
}

.form-field :deep(.q-field__control) {
  border-radius: 10px;
  background: #fff;
}

.form-field :deep(.q-field__bottom) {
  display: none;
}

.form-description :deep(textarea) {
  min-height: 84px;
}

.form-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  background: #fff;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.form-save-btn {
  padding: 0 20px;
  font-weight: 600;
}

@media (max-width: 599px) {
  .form-header {
    padding: 14px 16px;
  }

  .form-body {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 16px;
  }

  .form-footer {
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  }

  .form-save-btn {
    flex: 1;
  }
}
</style>
