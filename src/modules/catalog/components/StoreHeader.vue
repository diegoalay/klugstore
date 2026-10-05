<template>
  <div class="store-header">
    <div v-if="banner" class="store-banner">
      <img :src="banner" :alt="storeName" class="banner-image" />
      <div class="banner-overlay" />
    </div>

    <!-- Oculto a la vista pero presente para SEO y lectores de pantalla (único h1 de la portada). -->
    <div class="store-info visually-hidden">
      <h1>{{ storeName }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStoreConfigStore } from '@/stores'

const storeConfig = useStoreConfigStore()

const storeName = computed(() => storeConfig.storeName)
const description = computed(() => storeConfig.config?.description ?? '')
const banner = computed(() => storeConfig.config?.banner ?? '')
</script>

<style lang="scss" scoped>
.store-header {
  position: relative;
  padding-top: 24px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.store-banner {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 0 0 var(--ks-radius, 16px) var(--ks-radius, 16px);
}

.banner-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 40%,
    rgba(0, 0, 0, 0.3)
  );
}

@media (max-width: 768px) {
  .store-header {
    padding-top: 16px;
  }

  .store-banner {
    height: 160px;
  }
}
</style>
