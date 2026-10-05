<template>
  <q-page class="admin-page">
    <div class="ig-wrap">
      <q-inner-loading :showing="igStore.loading" color="dark" label="Cargando posts…" />

      <div class="ig-topbar">
        <div>
          <div class="ig-eyebrow"><q-icon name="fa-brands fa-instagram" size="14px" /> Instagram</div>
          <div class="ig-title">Crear productos desde tus publicaciones</div>
          <div class="ig-note">
            Para traer publicaciones nuevas corre <code>npm run sync:instagram</code>. Los nombres y precios son
            sugerencias: revísalos antes de guardar.
          </div>
        </div>
        <div class="ig-actions">
          <q-input
            v-model="search"
            outlined
            dense
            rounded
            clearable
            placeholder="Buscar en publicaciones…"
            class="ig-search"
            hide-bottom-space
          >
            <template #prepend><q-icon name="fa-solid fa-magnifying-glass" size="xs" color="grey-6" /></template>
          </q-input>
          <q-btn-toggle
            v-model="status"
            no-caps
            unelevated
            rounded
            toggle-color="dark"
            color="white"
            text-color="dark"
            class="ig-toggle"
            :options="statusOptions"
          />
        </div>
      </div>

      <div v-if="visible.length" class="ig-grid">
        <div v-for="item in visible" :key="item.post.id" class="ig-card">
          <a :href="item.post.permalink" target="_blank" rel="noopener noreferrer" class="ig-image">
            <img
              v-if="!brokenImages.has(item.post.id)"
              :src="item.post.imageUrls[0]"
              :alt="item.suggestion.name"
              loading="lazy"
              @error="brokenImages.add(item.post.id)"
            />
            <div v-else class="ig-image-empty">
              <q-icon name="fa-regular fa-image" size="22px" />
              <span>Foto caducada: vuelve a sincronizar</span>
            </div>
            <span class="ig-photos"><q-icon name="fa-regular fa-images" size="11px" /> {{ item.post.imageUrls.length }}</span>
            <q-badge v-if="item.suggestion.sold" color="deep-orange-6" class="ig-sold">Vendido</q-badge>
          </a>

          <div class="ig-body">
            <div class="ig-date">{{ formatDate(item.post.postedAt) }}</div>
            <div class="ig-name">{{ item.suggestion.name }}</div>
            <div class="ig-price">
              {{ item.suggestion.price !== null ? formatCurrency(item.suggestion.price) : 'Sin precio en el texto' }}
            </div>
            <div v-if="item.similarTo && item.post.status === 'pending'" class="ig-similar">
              <q-icon name="fa-solid fa-triangle-exclamation" size="11px" />
              <span>
                Parecido a
                <button type="button" class="ig-link" @click="openProductEditor(item.similarTo.id)">
                  «{{ item.similarTo.name }}»
                </button>
              </span>
              <button type="button" class="ig-link ig-link--action" @click="linkTo(item.post, item.similarTo.id)">
                Es el mismo
              </button>
            </div>
          </div>

          <div class="ig-card-actions">
            <template v-if="item.post.status === 'pending'">
              <q-btn
                unelevated
                no-caps
                no-wrap
                color="dark"
                icon="fa-solid fa-plus"
                label="Crear producto"
                class="admin-btn ig-primary"
                @click="createFrom(item)"
              />
              <q-btn outline round color="grey-6" icon="fa-solid fa-eye-slash" class="admin-btn ig-secondary" @click="ignore(item.post)">
                <q-tooltip>Ignorar (no es un producto)</q-tooltip>
              </q-btn>
            </template>
            <template v-else-if="item.post.status === 'imported'">
              <q-btn
                outline
                no-caps
                color="dark"
                no-wrap
                icon="fa-solid fa-pen"
                label="Ver producto"
                class="admin-btn ig-primary"
                :disable="!item.post.productId"
                @click="item.post.productId && openProductEditor(item.post.productId)"
              />
            </template>
            <template v-else>
              <q-btn
                outline
                no-caps
                color="dark"
                no-wrap
                icon="fa-solid fa-rotate-left"
                label="Restaurar"
                class="admin-btn ig-primary"
                @click="restore(item.post)"
              />
            </template>
          </div>
        </div>
      </div>

      <div v-else-if="!igStore.loading" class="ig-empty">
        <q-icon name="fa-brands fa-instagram" size="40px" color="grey-5" />
        <p>{{ igStore.posts.length ? 'No hay publicaciones en esta vista.' : 'Todavía no hay publicaciones sincronizadas.' }}</p>
      </div>

      <div v-if="filtered.length > visible.length" class="ig-more">
        <q-btn outline no-caps color="dark" label="Mostrar más" class="admin-btn" @click="pageSize += PAGE" />
      </div>

      <ProductFormDialog
        v-model="editorOpen"
        :product="editorProduct"
        :prefill="editorPrefill"
        @saved="handleEditorSaved"
        @request-delete="onRequestDelete"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Notify } from 'quasar'
import { usePageSeo } from '@/composables/usePageSeo'
import { useAdminProductEditor } from '@/composables/useAdminProductEditor'
import { useAdminFirestoreCatalogStore } from '@/stores/admin-firestore-catalog-store'
import { useAdminInstagramStore, type InstagramPost, type InstagramPostStatus } from '@/stores/admin-instagram-store'
import { findSimilarName, parseInstagramCaption, suggestCategory } from '@/utils/instagramCaption'
import { normalizeForSearch } from '@/utils/slugify'
import { formatCurrency } from '@/utils/format'
import ProductFormDialog from '@/components/admin/ProductFormDialog.vue'

usePageSeo({ title: 'Instagram | Admin', description: 'Crear productos desde Instagram.', path: '/admin/instagram', noIndex: true })

const PAGE = 48
const igStore = useAdminInstagramStore()
const catalog = useAdminFirestoreCatalogStore()
const {
  editorOpen,
  editorProduct,
  editorPrefill,
  openProductEditor,
  openProductEditorWithPrefill,
  handleEditorSaved,
  confirmDeleteProduct,
} = useAdminProductEditor()

const status = ref<InstagramPostStatus>('pending')
const search = ref('')
const pageSize = ref(PAGE)
const brokenImages = reactive(new Set<string>())

watch([status, search], () => (pageSize.value = PAGE))

onMounted(() => {
  if (!igStore.loaded) void igStore.load()
  if (!catalog.sourceReady) void catalog.load()
})

const statusOptions = computed(() => [
  { value: 'pending', label: `Pendientes (${igStore.countByStatus.pending})` },
  { value: 'imported', label: `Creados (${igStore.countByStatus.imported})` },
  { value: 'ignored', label: `Ignorados (${igStore.countByStatus.ignored})` },
])

const productNames = computed(() => catalog.products.map((p) => p.name))
const productByName = computed(() => new Map(catalog.products.map((p) => [p.name, p])))

const filtered = computed(() => {
  const q = normalizeForSearch(search.value)
  return igStore.posts
    .filter((p) => p.status === status.value)
    .filter((p) => !q || normalizeForSearch(p.caption).includes(q))
})

// Solo se analiza lo que se muestra (puede haber cientos de posts).
const visible = computed(() =>
  filtered.value.slice(0, pageSize.value).map((post) => {
    const suggestion = parseInstagramCaption(post.caption)
    const similarName = findSimilarName(suggestion.name, productNames.value)
    return { post, suggestion, similarTo: similarName ? (productByName.value.get(similarName) ?? null) : null }
  }),
)

type Item = (typeof visible.value)[number]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function createFrom({ post, suggestion }: Item) {
  const slugs = catalog.categories.map((c) => c.slug)
  const categoryId = suggestCategory(`${suggestion.name} ${suggestion.description}`, slugs) ?? slugs[0] ?? ''
  const prefill = {
    name: suggestion.name,
    description: suggestion.description,
    price: suggestion.price ?? 0,
    categoryId,
    tags: suggestion.tags,
    sold: suggestion.sold,
    visible: !suggestion.sold,
    images: post.imageUrls.map((url, i) => ({ url, alt: suggestion.name, order: i })),
    source: { type: 'instagram' as const, postId: post.id, url: post.permalink },
    ...(suggestion.measure ? { measure: suggestion.measure } : {}),
  }
  openProductEditorWithPrefill(prefill, async (productId) => {
    await igStore.setStatus(post.id, 'imported', productId)
  })
}

/** El post es un producto que ya existe: se vincula sin crear un duplicado. */
async function linkTo(post: InstagramPost, productId: string) {
  await igStore.setStatus(post.id, 'imported', productId)
  Notify.create({ type: 'positive', message: 'Publicación vinculada al producto existente' })
}

async function ignore(post: InstagramPost) {
  await igStore.setStatus(post.id, 'ignored')
  Notify.create({ message: 'Publicación ignorada', actions: [{ label: 'Deshacer', color: 'white', handler: () => void restore(post) }] })
}

async function restore(post: InstagramPost) {
  await igStore.setStatus(post.id, 'pending')
}

function onRequestDelete() {
  const p = editorProduct.value
  if (!p) return
  editorOpen.value = false
  confirmDeleteProduct(p, async () => {
    const post = igStore.posts.find((x) => x.productId === p.id)
    if (post) await igStore.setStatus(post.id, 'pending')
  })
}
</script>

<style scoped lang="scss">
.admin-page {
  background: #faf8f5;
  min-height: 100vh;
}

.ig-wrap {
  position: relative;
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
}

.ig-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.ig-eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d19793;
}

.ig-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin-top: 2px;
}

.ig-note {
  font-size: 0.8rem;
  color: #8a8a8a;
  margin-top: 4px;
  max-width: 560px;

  code {
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    padding: 1px 6px;
  }
}

.ig-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.ig-search {
  width: 240px;

  :deep(.q-field__control) {
    background: #fff;
    min-height: 40px;
  }
}

.ig-toggle {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  overflow: hidden;

  :deep(.q-btn) {
    min-height: 38px;
    font-size: 0.82rem;
  }
}

.ig-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.ig-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.ig-image {
  position: relative;
  display: block;
  aspect-ratio: 1;
  background: #f0ece6;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.ig-image-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #9a9a9a;
  font-size: 0.75rem;
  text-align: center;
  padding: 12px;
}

.ig-photos {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 0.72rem;
}

.ig-sold {
  position: absolute;
  top: 8px;
  left: 8px;
}

.ig-body {
  flex: 1;
  padding: 12px 14px 4px;
}

.ig-date {
  font-size: 0.7rem;
  color: #9a9a9a;
}

.ig-name {
  font-weight: 700;
  font-size: 0.9rem;
  line-height: 1.3;
  margin-top: 2px;
}

.ig-price {
  font-weight: 700;
  margin-top: 4px;
}

.ig-similar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 6px;
  margin-top: 6px;
  font-size: 0.72rem;
  color: #b26a00;
  background: #fff4e0;
  border-radius: 8px;
  padding: 6px 8px;
}

.ig-link {
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  color: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
  text-align: left;

  &--action {
    margin-left: auto;
    color: #000;
  }
}

.ig-card-actions {
  display: flex;
  gap: 6px;
  padding: 10px 12px 12px;
}

.ig-primary {
  flex: 1;
  font-size: 0.85rem;

  :deep(.q-icon) {
    font-size: 13px;
    margin-right: 8px;
  }
}

.ig-secondary :deep(.q-icon) {
  font-size: 14px;
}

.ig-empty {
  text-align: center;
  padding: 60px 20px;
  color: #8a8a8a;
}

.ig-more {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 599px) {
  .ig-wrap {
    padding: 16px;
  }

  .ig-search {
    width: 100%;
  }

  .ig-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}
</style>
