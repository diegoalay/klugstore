<template>
  <ul class="trust-strip" aria-label="Por qué comprar en SweetHome">
    <li v-for="point in TRUST_POINTS" :key="point.title" class="trust-item">
      <q-icon :name="point.icon" size="14px" />
      <span>
        <strong>{{ point.title }}</strong> · {{ point.detail }}
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { TRUST_POINTS } from '@/content/purchaseInfo'
</script>

<style lang="scss" scoped>
.trust-strip {
  list-style: none;
  margin: 0 0 16px;
  padding: 0 0 16px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 24px;
  border-bottom: 1px solid color-mix(in srgb, var(--ks-secondary, #d19793) 15%, transparent);
}

.trust-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--ks-text-secondary, #6b7280);

  .q-icon {
    color: var(--ks-secondary, #d19793);
  }

  strong {
    color: var(--ks-text, #000);
    font-weight: 600;
  }
}
</style>
