<template>
  <q-layout view="hHh lpR fFf" class="admin-layout">
    <q-header elevated class="admin-header">
      <q-toolbar class="admin-toolbar">
        <q-icon name="fa-solid fa-house-chimney" size="18px" class="admin-header-icon" />
        <q-toolbar-title class="admin-header-title">SweetHome <span>Admin</span></q-toolbar-title>
        <q-btn
          v-if="showAdminNav"
          flat
          no-caps
          icon="fa-solid fa-store"
          label="Ver tienda"
          to="/catalog"
          class="admin-btn admin-header-btn"
        />
        <q-btn
          v-if="showAdminNav"
          flat
          no-caps
          icon="fa-solid fa-arrow-right-from-bracket"
          label="Salir"
          class="admin-btn admin-header-btn"
          @click="logout"
        />
        <q-btn
          v-if="!showAdminNav"
          flat
          no-caps
          icon="fa-solid fa-arrow-left"
          label="Catálogo público"
          to="/catalog"
          class="admin-btn admin-header-btn"
        />
      </q-toolbar>
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
import { useAdminCatalogDraftStore } from '@/stores/admin-catalog-draft-store'

const route = useRoute()
const router = useRouter()
const draftStore = useAdminCatalogDraftStore()

const showAdminNav = computed(() => route.name === 'admin-catalog')

async function logout() {
  await signOutAdmin()
  draftStore.reset()
  await router.push({ name: 'admin-login' })
}
</script>

<style scoped lang="scss">
.admin-layout {
  background: #faf8f5;
}

.admin-header {
  background: #000000;
  color: #fff;
}

.admin-toolbar {
  min-height: 56px;
  padding: 0 20px;
  gap: 4px;
}

.admin-header-icon {
  color: #d19793;
  margin-right: 10px;
}

.admin-header-title {
  font-weight: 700;
  letter-spacing: 0.01em;

  span {
    color: #d19793;
    font-weight: 500;
  }
}

.admin-header-btn {
  border-radius: 999px;
  padding: 0 14px;
  font-size: 0.85rem;

  :deep(.q-btn__content) {
    gap: 7px;
  }
}
</style>
