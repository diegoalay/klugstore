<template>
  <q-page padding class="admin-login-page">
    <q-card flat bordered class="login-card">
      <q-card-section>
        <div class="text-h6">Acceso</div>
      </q-card-section>
      <q-card-section class="q-gutter-md">
        <q-input v-model="user" outlined stack-label label="Usuario" autocomplete="username" />
        <q-input
          v-model="pass"
          outlined
          stack-label
          :type="showPassword ? 'text' : 'password'"
          label="Contraseña"
          autocomplete="current-password"
          @keyup.enter="login"
        >
          <template #append>
            <q-icon
              :name="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
              class="cursor-pointer"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              tabindex="0"
              @click="showPassword = !showPassword"
              @keyup.enter="showPassword = !showPassword"
            />
          </template>
        </q-input>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn color="dark" unelevated label="Entrar" @click="login" />
      </q-card-actions>
    </q-card>
    <div class="text-center q-mt-lg">
      <q-btn flat no-caps color="grey-8" label="Volver al catálogo público" to="/catalog" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { usePageSeo } from 'src/composables/usePageSeo'
import { tryAdminLogin } from 'src/utils/adminAuth'
import { setAdminSession } from 'src/utils/adminCatalogStorage'
import { useAdminCatalogDraftStore } from 'src/stores/admin-catalog-draft-store'

usePageSeo({
  title: 'Admin — acceso',
  description: 'Acceso al panel de catálogo.',
  path: '/admin/login',
  noIndex: true,
})

const route = useRoute()
const router = useRouter()
const draftStore = useAdminCatalogDraftStore()

const user = ref('')
const pass = ref('')
const showPassword = ref(false)

async function login() {
  if (!tryAdminLogin(user.value, pass.value)) {
    Notify.create({ type: 'negative', message: 'Usuario o contraseña incorrectos' })
    return
  }
  setAdminSession(true)
  pass.value = ''
  await draftStore.loadDraft()

  const rawRedirect = route.query.redirect
  const redirect = typeof rawRedirect === 'string' ? rawRedirect : ''
  if (redirect.startsWith('/admin')) {
    await router.push(redirect)
    return
  }
  await router.push({ name: 'admin-catalog' })
}
</script>

<style scoped lang="scss">
.admin-login-page {
  max-width: 1120px;
  margin: 0 auto;
  padding-top: 2rem;
}

.login-card {
  max-width: 420px;
  margin: 24px auto 0;
  background: #fff;
}
</style>
