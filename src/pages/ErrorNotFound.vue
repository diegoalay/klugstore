<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStoreConfigStore } from 'src/stores'
import { usePageSeo } from 'src/composables/usePageSeo'

const route = useRoute()
const storeConfig = useStoreConfigStore()
const path = computed(() => route.path || '/')

usePageSeo({
  title: computed(() => `Página no encontrada | ${storeConfig.seoTitleSuffix}`),
  description: 'La página que buscas no existe en este sitio.',
  path,
  noIndex: true,
})
</script>

<template>
  <q-page class="error-page">
    <div class="error-content">
      <h1 class="error-code">404</h1>
      <p class="error-message">Página no encontrada</p>
      <q-btn
        no-caps
        unelevated
        color="primary"
        label="Ir al inicio"
        @click="$router.push('/')"
      />
    </div>
  </q-page>
</template>

<style lang="scss" scoped>
.error-page {
  background: var(--ks-bg, #faf8f5);
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  gap: 12px;
  text-align: center;
}

.error-code {
  font-size: 5rem;
  font-weight: 900;
  color: var(--ks-primary, #1a1a2e);
  opacity: 0.2;
  margin: 0;
}

.error-message {
  font-size: 1.1rem;
  color: var(--ks-text-secondary, #6b7280);
}
</style>
