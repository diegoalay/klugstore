<template>
  <q-layout view="hHh lpR fFf" class="admin-layout">
    <q-header class="admin-header">
      <q-toolbar class="admin-toolbar">
        <div class="admin-toolbar-inner">
          <router-link :to="{ name: 'admin-catalog' }" class="admin-brand">
            <q-icon name="fa-solid fa-house-chimney" size="16px" class="admin-brand-icon" />
            <span>SweetHome <em>Admin</em></span>
          </router-link>

          <q-space />

          <template v-if="isAuthed">
            <q-btn
              flat
              no-caps
              icon="fa-solid fa-store"
              label="Ver tienda"
              to="/catalog"
              class="admin-btn admin-header-btn"
            />
            <q-btn
              flat
              round
              icon="fa-solid fa-arrow-right-from-bracket"
              class="admin-btn admin-header-btn"
              @click="logout"
            >
              <q-tooltip>Salir</q-tooltip>
            </q-btn>
          </template>
          <q-btn
            v-else
            flat
            no-caps
            icon="fa-solid fa-arrow-left"
            label="Catálogo público"
            to="/catalog"
            class="admin-btn admin-header-btn"
          />
        </div>
      </q-toolbar>

      <!-- Navegación compartida por todas las pantallas del admin; marca la activa. -->
      <nav v-if="isAuthed" class="admin-nav" aria-label="Secciones del admin">
        <div class="admin-nav-inner">
          <router-link
            v-for="item in NAV"
            :key="item.name"
            :to="{ name: item.name }"
            class="admin-nav-item"
            active-class="is-active"
            exact-active-class="is-active"
          >
            <q-icon :name="item.icon" size="14px" />
            {{ item.label }}
          </router-link>
        </div>
      </nav>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signOutAdmin } from '@/utils/adminAuth'

const NAV = [
  { name: 'admin-catalog', label: 'Productos', icon: 'fa-solid fa-boxes-stacked' },
  { name: 'admin-instagram', label: 'Instagram', icon: 'fa-brands fa-instagram' },
] as const

const route = useRoute()
const router = useRouter()

const isAuthed = computed(() => route.meta.requiresAdmin === true)

async function logout() {
  await signOutAdmin()
  await router.push({ name: 'admin-login' })
}
</script>

<style scoped lang="scss">
.admin-layout {
  background: #faf8f5;
}

.admin-header {
  background: #000;
  color: #fff;
}

.admin-toolbar {
  min-height: 52px;
  padding: 0;
}

/* Mismo ancho y margen que el contenido de las páginas del admin (1280px / 24px). */
.admin-toolbar-inner {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.admin-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  text-decoration: none;
  font-weight: 700;
  font-size: 1.05rem;

  em {
    font-style: normal;
    font-weight: 500;
    color: #d19793;
  }
}

.admin-brand-icon {
  color: #d19793;
}

.admin-header-btn {
  border-radius: 999px;
  padding: 0 14px;
  font-size: 0.85rem;

  &.q-btn--round {
    padding: 0;
  }

  :deep(.q-btn__content) {
    gap: 7px;
  }
}

.admin-nav {
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  color: #000;
}

.admin-nav-inner {
  display: flex;
  gap: 6px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 8px 24px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.admin-nav-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  color: #6b6b6b;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: #f3eeea;
    color: #000;
  }

  &.is-active {
    background: #000;
    color: #fff;
  }
}

@media (max-width: 599px) {
  .admin-toolbar-inner,
  .admin-nav-inner {
    padding-left: 12px;
    padding-right: 12px;
  }
}
</style>
