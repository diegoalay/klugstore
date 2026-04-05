<template>
  <div class="store-header">
    <div v-if="banner" class="store-banner">
      <img :src="banner" :alt="storeName" class="banner-image" />
      <div class="banner-overlay" />
    </div>

    <div class="store-info" :class="{ 'with-banner': !!banner }">
      <h1 class="store-name">{{ storeName }}</h1>
      <p v-if="description" class="store-description">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStoreConfigStore } from 'src/stores'

const storeConfig = useStoreConfigStore()

const storeName = computed(() => storeConfig.storeName)
const description = computed(() => storeConfig.config?.description ?? '')
const banner = computed(() => storeConfig.config?.banner ?? '')
</script>

<style lang="scss" scoped>
.store-header {
  position: relative;
  margin-bottom: 24px;
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

.store-info {
  padding: 24px 20px 0;
  max-width: 960px;
  margin: 0 auto;

  &.with-banner {
    margin-top: -40px;
    position: relative;
    z-index: 1;
  }
}

.store-name {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--ks-text, #1a1a2e);
  margin: 0 0 8px;
  line-height: 1.2;
}

.store-description {
  font-size: 0.95rem;
  color: var(--ks-text-secondary, #6b7280);
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .store-banner {
    height: 160px;
  }

  .store-name {
    font-size: 1.4rem;
  }

  .store-info {
    padding: 16px 16px 0;
  }
}
</style>
