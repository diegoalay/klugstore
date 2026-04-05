<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="catalog-header" :style="headerStyle">
      <q-toolbar class="catalog-toolbar">
        <div class="catalog-brand" @click="goHome">
          <img
            v-if="storeConfig.logo"
            :src="storeConfig.logo"
            :alt="storeConfig.storeName"
            class="catalog-logo"
          />
          <span v-else class="catalog-brand-name">{{ storeConfig.storeName }}</span>
        </div>

        <q-space />

        <div class="toolbar-end">
          <nav class="catalog-nav catalog-nav--desktop" aria-label="Principal">
            <router-link
              :to="{ name: 'catalog-home' }"
              class="nav-link"
              :class="{ 'nav-link--active': isCatalogActive }"
            >
              Catálogo
            </router-link>
            <router-link
              :to="{ name: 'about' }"
              class="nav-link"
              :class="{ 'nav-link--active': isAboutActive }"
            >
              Nosotros
            </router-link>
          </nav>

          <q-btn
            flat
            round
            dense
            size="sm"
            icon="fa-solid fa-magnifying-glass"
            class="nav-search-btn"
            :class="{ 'nav-search-btn--open': showSearch }"
            aria-label="Buscar productos"
            @click="toggleSearch"
          />
        </div>
      </q-toolbar>

      <!-- Nav inferior (solo mobile) -->
      <nav class="catalog-nav catalog-nav--mobile" aria-label="Principal móvil">
        <router-link
          :to="{ name: 'catalog-home' }"
          class="nav-link"
          :class="{ 'nav-link--active': isCatalogActive }"
        >
          Catálogo
        </router-link>
        <router-link
          :to="{ name: 'about' }"
          class="nav-link"
          :class="{ 'nav-link--active': isAboutActive }"
        >
          Nosotros
        </router-link>
      </nav>

      <div v-if="showSearch" class="search-bar">
        <div class="search-bar-track">
          <q-input
            ref="searchInputRef"
            v-model="searchQuery"
            dense
            outlined
            placeholder="Buscar productos..."
            class="search-input"
            hide-bottom-space
          >
            <template #prepend>
              <q-icon name="fa-solid fa-magnifying-glass" size="xs" class="search-input-icon" />
            </template>
            <template v-if="searchQuery" #append>
              <q-icon
                name="fa-solid fa-xmark"
                size="xs"
                class="cursor-pointer search-input-clear"
                @click="clearSearch"
              />
            </template>
          </q-input>
        </div>

        <!-- Dropdown de resultados -->
        <div v-if="searchQuery && searchResults.length > 0" class="search-results">
          <div
            v-for="product in searchResults"
            :key="product.id"
            class="search-result-item"
            @click="goToProduct(product)"
          >
            <div class="search-result-thumb">
              <img
                v-if="product.images[0]"
                :src="product.images[0].url"
                :alt="product.name"
                loading="lazy"
              />
            </div>
            <div class="search-result-info">
              <p class="search-result-category">{{ product.categoryName }}</p>
              <p class="search-result-name">{{ product.name }}</p>
              <p class="search-result-price">
                {{
                  new Intl.NumberFormat('es-GT', {
                    style: 'currency',
                    currency: product.currency,
                  }).format(product.price)
                }}
              </p>
            </div>
            <q-icon name="fa-solid fa-chevron-right" size="xs" class="search-result-arrow" />
          </div>
        </div>

        <!-- Sin resultados -->
        <div v-else-if="searchQuery && searchResults.length === 0" class="search-empty">
          <q-icon name="fa-solid fa-magnifying-glass" size="sm" />
          <p>No se encontraron productos para "{{ searchQuery }}"</p>
        </div>
      </div>
    </q-header>

    <q-page-container>
      <router-view v-if="!loading" />
      <div v-else class="loading-container">
        <q-spinner-dots size="48px" :color="theme?.primaryColor ? undefined : 'primary'" />
        <p class="loading-text">Cargando catálogo...</p>
      </div>
    </q-page-container>

    <!-- WhatsApp FAB -->
    <q-page-sticky position="bottom-right" :offset="[20, 20]">
      <q-btn
        fab-mini
        icon="fa-brands fa-whatsapp"
        color="positive"
        class="whatsapp-fab"
        aria-label="Escríbenos por WhatsApp"
        @click="openWhatsAppGeneral()"
      />
    </q-page-sticky>

    <!-- Footer -->
    <q-footer class="catalog-footer">
      <div class="footer-content">
        <div v-if="socialLinks" class="social-links">
          <q-btn
            v-if="socialLinks.instagram"
            flat
            round
            dense
            icon="fa-brands fa-instagram"
            :href="socialLinks.instagram"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            tag="a"
          />
          <q-btn
            v-if="socialLinks.facebook"
            flat
            round
            dense
            icon="fa-brands fa-facebook"
            :href="socialLinks.facebook"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            tag="a"
          />
          <q-btn
            v-if="socialLinks.whatsapp"
            flat
            round
            dense
            icon="fa-brands fa-whatsapp"
            :href="socialLinks.whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            tag="a"
          />
          <q-btn
            v-if="socialLinks.tiktok"
            flat
            round
            dense
            icon="fa-brands fa-tiktok"
            :href="socialLinks.tiktok"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            tag="a"
          />
        </div>
        <p class="footer-copyright">
          © 2026 <strong>SweetHomeGT</strong> — un producto de
          <strong>SolayTech</strong>
        </p>
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { QInput } from 'quasar'
import { useStoreConfigStore, useCatalogStore } from 'src/stores'
import { useCatalog } from 'src/composables/useCatalog'
import { stashCatalogHashBeforeProductNavigation } from 'src/composables/useCatalogHash'
import { useWhatsApp } from 'src/composables/useWhatsApp'
import { resolveStoreSlug } from 'src/utils/storeResolver'
import { applyCatalogSortMode } from 'src/utils/catalogSort'

const route = useRoute()
const router = useRouter()
const storeConfig = useStoreConfigStore()
const catalogStore = useCatalogStore()
const { loadCatalog } = useCatalog()
const { openWhatsAppGeneral } = useWhatsApp()

const showSearch = ref(false)
/** Ligado al store para que #cat=&q= en la URL restaure el texto al recargar */
const searchQuery = computed({
  get: () => catalogStore.searchQuery,
  set: (v: string) => catalogStore.setSearchQuery(v),
})
const loading = ref(true)
const searchInputRef = ref<QInput | null>(null)

const isCatalogActive = computed(() =>
  route.path === '/catalog' || route.path.startsWith('/catalog/'),
)
const isAboutActive = computed(() => route.path === '/about')

const searchResults = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return []
  const list = catalogStore.products.filter((p) => {
    if (!p.visible) return false
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(q))
    )
  })
  return applyCatalogSortMode(list, catalogStore.catalogSort).slice(0, 8)
})

async function toggleSearch() {
  showSearch.value = !showSearch.value
  if (showSearch.value) {
    await nextTick()
    searchInputRef.value?.focus()
  }
}

const theme = computed(() => storeConfig.theme)
const socialLinks = computed(() => storeConfig.socialLinks)

const headerStyle = computed(() => ({
  backgroundColor: theme.value?.surfaceColor ?? '#ffffff',
  borderBottom: `1px solid ${theme.value?.backgroundColor ?? '#eee8e0'}`,
}))

function goHome() {
  void router.push({ name: 'catalog-home' })
}

function goToProduct(product: { slug: string }) {
  stashCatalogHashBeforeProductNavigation()
  void router.push({
    name: 'catalog-product',
    params: { productSlug: product.slug },
  })
  // Cerrar búsqueda tras navegar
  showSearch.value = false
  searchQuery.value = ''
  catalogStore.setSearchQuery('')
}

function clearSearch() {
  catalogStore.setSearchQuery('')
}

watch(
  () => [route.name, catalogStore.searchQuery] as const,
  ([name, q]) => {
    if (name === 'catalog-home' && q.trim().length > 0) {
      showSearch.value = true
    }
  },
  { immediate: true },
)

onMounted(async () => {
  const storeSlug = resolveStoreSlug()
  await loadCatalog(storeSlug)
  loading.value = false
})
</script>

<style lang="scss" scoped>
.catalog-header {
  box-shadow: none;
}

.catalog-toolbar {
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
  padding: 18px 16px;
  min-height: 76px;
}

.catalog-brand {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.catalog-logo {
  height: 44px;
  width: auto;
  max-width: 160px;
  object-fit: contain;
  display: block;
}

@media (max-width: 768px) {
  .catalog-logo {
    height: 38px;
    max-width: 130px;
  }
}

.catalog-brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ks-text, #1a1a2e);
}

.toolbar-end {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.catalog-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(209, 151, 147, 0.08);
}

.catalog-nav--mobile {
  display: none;
}

.nav-link {
  text-decoration: none;
  color: var(--ks-secondary, #d19793);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 8px 16px;
  border-radius: 999px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    color: var(--ks-text, #000);
    background: rgba(255, 255, 255, 0.85);
  }

  &.nav-link--active {
    color: var(--ks-text, #000);
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }
}

.nav-search-btn {
  color: var(--ks-secondary, #d19793) !important;
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;

  :deep(.q-icon) {
    font-size: 1rem;
  }

  &:hover {
    background: rgba(209, 151, 147, 0.14) !important;
    color: var(--ks-text, #000) !important;
  }

  &.nav-search-btn--open {
    background: rgba(209, 151, 147, 0.2) !important;
    color: var(--ks-text, #000) !important;
  }
}

@media (max-width: 768px) {
  .catalog-nav {
    gap: 2px;
    padding: 3px;
  }

  .nav-link {
    padding: 7px 12px;
    font-size: 0.8125rem;
  }

  .toolbar-end {
    gap: 6px;
  }

  .nav-search-btn {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
  }
}

.search-bar {
  max-width: 960px;
  margin: 0 auto;
  padding: 8px 24px 20px;
  position: relative;
}

/* Misma familia visual que .catalog-nav / categorías */
.search-bar-track {
  padding: 4px;
  border-radius: 999px;
  background: rgba(209, 151, 147, 0.08);
}

.search-input {
  :deep(.q-field__control) {
    border-radius: 999px !important;
    min-height: 44px;
    background: #ffffff !important;
    padding-left: 4px;
    padding-right: 4px;
  }

  :deep(.q-field__marginal) {
    height: 44px;
  }

  /* Q outlined: quitar borde negro, usar rosa suave */
  :deep(.q-field--outlined .q-field__control:before) {
    border: 1px solid rgba(209, 151, 147, 0.28);
  }

  :deep(.q-field--outlined .q-field__control:hover:before) {
    border-color: rgba(209, 151, 147, 0.45);
  }

  :deep(.q-field--outlined.q-field--focused .q-field__control:before) {
    border-color: var(--ks-secondary, #d19793);
    border-width: 1px;
  }

  :deep(.q-field--outlined.q-field--focused .q-field__control:after) {
    border-width: 0;
  }

  :deep(.q-field__native) {
    padding-top: 10px;
    padding-bottom: 10px;
    color: var(--ks-text, #000);
    font-weight: 500;
    font-size: 0.9rem;
  }

  :deep(.q-field__native::placeholder) {
    color: rgba(0, 0, 0, 0.42);
  }
}

.search-input-icon {
  color: var(--ks-secondary, #d19793);
}

.search-input-clear {
  color: var(--ks-text-secondary, #6b6b6b);
  padding: 4px;
  border-radius: 999px;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    color: var(--ks-text, #000);
    background: rgba(209, 151, 147, 0.12);
  }
}

.search-results {
  position: absolute;
  top: calc(100% - 12px);
  left: 24px;
  right: 24px;
  background: var(--ks-surface, #ffffff);
  border-radius: var(--ks-radius, 12px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--ks-bg, #f0f0f0);
  max-height: 480px;
  overflow-y: auto;
  z-index: 100;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--ks-bg, #f5f5f5);
  transition: background 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--ks-bg, #faf8f5);

    .search-result-arrow {
      transform: translateX(4px);
      opacity: 1;
    }
  }
}

.search-result-thumb {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: var(--ks-bg, #f5f5f5);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.search-result-info {
  flex: 1 1 auto;
  min-width: 0;
}

.search-result-category {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--ks-text-secondary, #6b6b6b);
  margin: 0 0 2px;
  font-weight: 600;
}

.search-result-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ks-text, #000);
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result-price {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ks-text, #000);
  margin: 0;
}

.search-result-arrow {
  color: var(--ks-text-secondary, #6b6b6b);
  opacity: 0.5;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.search-empty {
  position: absolute;
  top: calc(100% - 12px);
  left: 24px;
  right: 24px;
  background: var(--ks-surface, #ffffff);
  border-radius: var(--ks-radius, 12px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--ks-bg, #f0f0f0);
  padding: 32px 20px;
  text-align: center;
  z-index: 100;
  color: var(--ks-text-secondary, #6b6b6b);

  p {
    margin: 8px 0 0;
    font-size: 0.9rem;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.loading-text {
  color: var(--ks-text-secondary, #6b7280);
  font-size: 0.9rem;
}

.whatsapp-fab {
  box-shadow: 0 4px 16px rgba(37, 211, 102, 0.35);
  width: 48px !important;
  height: 48px !important;
  min-height: 48px !important;
  min-width: 48px !important;

  :deep(.q-icon) {
    font-size: 20px;
  }

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 20px rgba(37, 211, 102, 0.45);
  }
}

.catalog-footer {
  background: var(--ks-surface, #ffffff);
  border-top: 1px solid var(--ks-bg, #f0f0f0);
  padding: 16px;
}

.footer-content {
  max-width: 960px;
  margin: 0 auto;
  text-align: center;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;

  .q-btn {
    color: var(--ks-text-secondary, #6b7280);
    min-height: 40px;
    padding: 8px;

    &:hover {
      color: var(--ks-primary, #1a1a2e);
    }
  }
}

.footer-copyright {
  font-size: 0.75rem;
  color: var(--ks-text-secondary, #6b7280);
  margin: 0;
}
</style>
