<template>
  <q-layout view="hHh lpR fFf" class="admin-layout">
    <q-header elevated class="admin-header">
      <q-toolbar>
        <q-toolbar-title>Admin · catálogo (MVP)</q-toolbar-title>
        <q-btn v-if="showAdminNav" flat no-caps label="Ver tienda" to="/catalog" />
        <q-btn v-if="showAdminNav" flat no-caps label="Salir" @click="logout" />
        <q-btn v-if="!showAdminNav" flat no-caps label="Catálogo público" to="/catalog" />
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
import { setAdminSession } from 'src/utils/adminCatalogStorage'
import { useAdminCatalogDraftStore } from 'src/stores/admin-catalog-draft-store'

const route = useRoute()
const router = useRouter()
const draftStore = useAdminCatalogDraftStore()

const showAdminNav = computed(() => route.name === 'admin-catalog')

function logout() {
  setAdminSession(false)
  draftStore.reset()
  void router.push({ name: 'admin-login' })
}
</script>

<style scoped lang="scss">
.admin-layout {
  background: #e8e8ea;
}

.admin-header {
  background: #1a1a2e;
  color: #fff;
}
</style>
