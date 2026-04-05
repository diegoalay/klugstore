<template>
  <div class="catalog-sort">
    <div id="catalog-sort-label" class="catalog-sort__label">Ordenar por</div>
    <div class="catalog-sort__track">
      <q-select
        :model-value="modelValue"
        :options="options"
        option-value="value"
        option-label="label"
        emit-value
        map-options
        dense
        borderless
        hide-bottom-space
        dropdown-icon="fa-solid fa-chevron-down"
        popup-content-class="catalog-sort-menu"
        class="catalog-sort__control"
        aria-labelledby="catalog-sort-label"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CatalogSortMode } from 'src/utils/catalogSort'

defineProps<{
  modelValue: CatalogSortMode
  options: { value: CatalogSortMode; label: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CatalogSortMode]
}>()
</script>

<style lang="scss" scoped>
.catalog-sort {
  max-width: 280px;
}

.catalog-sort__label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ks-text-secondary, #6b7280);
  margin-bottom: 6px;
  padding-left: 4px;
}

.catalog-sort__track {
  padding: 3px 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ks-secondary, #d19793) 10%, transparent);
  width: 100%;
}

.catalog-sort__control {
  width: 100%;

  :deep(.q-field__control) {
    border-radius: 999px !important;
    background: var(--ks-surface, #ffffff) !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    min-height: 38px !important;
    padding-left: 14px;
    padding-right: 2px;
    transition:
      box-shadow 0.2s ease,
      background 0.2s ease;
  }

  :deep(.q-field__native) {
    min-height: 38px !important;
    padding: 0;
    font-weight: 600;
    font-size: 0.875rem;
    letter-spacing: 0.02em;
    color: var(--ks-text, #1a1a2e);
  }

  :deep(.q-field--focused .q-field__control) {
    box-shadow:
      0 1px 4px rgba(0, 0, 0, 0.06),
      0 0 0 2px color-mix(in srgb, var(--ks-secondary, #d19793) 38%, transparent);
  }

  :deep(.q-select__dropdown-icon) {
    color: var(--ks-secondary, #d19793);
  }
}

@media (max-width: 768px) {
  .catalog-sort {
    max-width: none;
    width: 100%;
  }
}
</style>

<!-- Menú en portal: clases globales -->
<style lang="scss">
.catalog-sort-menu.q-menu {
  border-radius: 14px !important;
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.04) !important;
  padding: 6px !important;
  margin-top: 8px !important;
  border: 1px solid color-mix(in srgb, var(--ks-secondary, #d19793) 18%, transparent);
  background: var(--ks-surface, #ffffff) !important;
}

.catalog-sort-menu .q-item {
  border-radius: 10px;
  min-height: 42px;
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.02em;
  color: var(--ks-text, #1a1a2e);
  padding-left: 14px;
  padding-right: 14px;
}

.catalog-sort-menu .q-item:hover,
.catalog-sort-menu .q-manual-focusable--focused {
  background: color-mix(in srgb, var(--ks-secondary, #d19793) 14%, transparent) !important;
}

.catalog-sort-menu .q-item--active {
  background: color-mix(in srgb, var(--ks-secondary, #d19793) 10%, transparent) !important;
  color: var(--ks-text, #000);
}
</style>
