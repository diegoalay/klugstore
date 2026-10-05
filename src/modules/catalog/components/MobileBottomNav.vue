<template>
  <!-- Solo celular (ver CSS). "Admin" queda fuera de la vista: aparece al deslizar la barra. -->
  <nav class="bottom-nav" aria-label="Navegación principal">
    <div class="bottom-nav-track">
      <button type="button" class="bottom-nav-item" :class="{ active: searchOpen }" @click="emit('search')">
        <q-icon name="fa-solid fa-magnifying-glass" />
        <span>Buscar</span>
      </button>
      <router-link
        v-for="item in ITEMS"
        :key="item.name"
        :to="{ name: item.name }"
        class="bottom-nav-item"
        :class="{ active: !searchOpen && isActive(item.name) }"
      >
        <q-icon :name="item.icon" />
        <span>{{ item.label }}</span>
      </router-link>
      <router-link :to="adminRoute" class="bottom-nav-item bottom-nav-item--admin" rel="nofollow">
        <q-icon name="fa-solid fa-lock" />
        <span>Admin</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminSession } from '@/composables/useAdminSession'

defineProps<{ searchOpen: boolean }>()
const emit = defineEmits<{ search: [] }>()

const ITEMS = [
  { name: 'catalog-home', label: 'Catálogo', icon: 'fa-solid fa-bag-shopping' },
  { name: 'about', label: 'Nosotros', icon: 'fa-solid fa-heart' },
  { name: 'faq', label: 'FAQs', icon: 'fa-solid fa-circle-question' },
] as const

const route = useRoute()
const { isAdmin } = useAdminSession()
const adminRoute = computed(() => (isAdmin.value ? '/admin/catalogo' : '/admin/login'))

function isActive(name: (typeof ITEMS)[number]['name']) {
  if (name === 'catalog-home') return route.path.startsWith('/catalog')
  return route.name === name
}
</script>

<style lang="scss" scoped>
.bottom-nav {
  display: none;
}

@media (max-width: 599px) {
  .bottom-nav {
    display: block;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2000;
    background: var(--ks-surface, #fff);
    border-top: 1px solid color-mix(in srgb, var(--ks-secondary, #d19793) 18%, transparent);
    box-shadow: 0 -4px 18px rgba(0, 0, 0, 0.06);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .bottom-nav-track {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  /* 4 ítems llenan el ancho; "Admin" (el 5º) queda fuera hasta deslizar. */
  .bottom-nav-item {
    flex: 0 0 25%;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 60px;
    border: 0;
    background: none;
    font: inherit;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--ks-secondary, #d19793);
    text-decoration: none;
    cursor: pointer;
    position: relative;
    transition: color 0.2s ease;

    .q-icon {
      font-size: 18px;
    }

    &.active {
      color: var(--ks-text, #000);

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 30%;
        right: 30%;
        height: 3px;
        border-radius: 0 0 3px 3px;
        background: var(--ks-text, #000);
      }
    }
  }

  .bottom-nav-item--admin {
    opacity: 0.6;
  }
}
</style>
