<template>
  <q-page class="admin-login-page flex flex-center">
    <div class="login-wrap">
      <div class="login-brand">
        <img
          src="/brand/sweethome-logo.svg"
          alt="SweetHome"
          class="login-logo"
          @error="logoFailed = true"
          v-show="!logoFailed"
        />
        <div v-if="logoFailed" class="login-logo-fallback">SweetHome</div>
        <p class="login-subtitle">Panel de administración del catálogo</p>
      </div>

      <q-card flat class="login-card">
        <q-card-section class="login-card-section">
          <div class="text-h6 login-title">Iniciar sesión</div>
          <p class="login-hint">Entra con tu correo y contraseña de administrador.</p>

          <div class="q-gutter-md q-mt-md">
            <q-input
              v-model="email"
              outlined
              type="email"
              label="Correo"
              autocomplete="username"
              color="dark"
              class="login-field"
              @keyup.enter="login"
            >
              <template #prepend>
                <q-icon name="fa-regular fa-envelope" />
              </template>
            </q-input>
            <q-input
              v-model="pass"
              outlined
              :type="showPassword ? 'text' : 'password'"
              label="Contraseña"
              autocomplete="current-password"
              color="dark"
              class="login-field"
              @keyup.enter="login"
            >
              <template #prepend>
                <q-icon name="fa-regular fa-lock-keyhole" />
              </template>
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
          </div>

          <q-btn
            color="dark"
            unelevated
            no-caps
            label="Entrar"
            class="admin-btn login-submit full-width q-mt-lg"
            :loading="loading"
            @click="login"
          />

          <div class="text-center q-mt-sm">
            <q-btn
              flat
              no-caps
              color="grey-7"
              class="admin-btn-sm"
              label="Olvidé mi contraseña"
              :disable="loading"
              @click="forgotPassword"
            />
          </div>
        </q-card-section>
      </q-card>

      <div class="text-center q-mt-lg">
        <q-btn
          flat
          no-caps
          color="grey-7"
          icon="fa-solid fa-arrow-left"
          label="Volver al catálogo público"
          class="admin-btn"
          to="/catalog"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { usePageSeo } from '@/composables/usePageSeo'
import { signInAdmin, resetAdminPassword } from '@/utils/adminAuth'

usePageSeo({
  title: 'Admin — acceso',
  description: 'Acceso al panel de catálogo.',
  path: '/admin/login',
  noIndex: true,
})

const route = useRoute()
const router = useRouter()

const email = ref('')
const pass = ref('')
const showPassword = ref(false)
const loading = ref(false)
const logoFailed = ref(false)

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? ''
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Correo o contraseña incorrectos'
  }
  if (code === 'auth/too-many-requests') {
    return 'Demasiados intentos — espera unos minutos'
  }
  if (code === 'auth/invalid-email') {
    return 'Correo inválido'
  }
  if (code === 'auth/user-disabled' || code === 'admin/access-denied') {
    return 'Esta cuenta no tiene acceso al admin'
  }
  return 'No se pudo iniciar sesión'
}

async function login() {
  if (!email.value || !pass.value) {
    Notify.create({ type: 'negative', message: 'Completa correo y contraseña' })
    return
  }
  loading.value = true
  try {
    await signInAdmin(email.value, pass.value)
    pass.value = ''

    const rawRedirect = route.query.redirect
    const redirect = typeof rawRedirect === 'string' ? rawRedirect : ''
    if (redirect.startsWith('/admin')) {
      await router.push(redirect)
      return
    }
    await router.push({ name: 'admin-catalog' })
  } catch (err) {
    Notify.create({ type: 'negative', message: friendlyAuthError(err) })
  } finally {
    loading.value = false
  }
}

async function forgotPassword() {
  if (!email.value) {
    Notify.create({ type: 'warning', message: 'Escribe tu correo arriba primero' })
    return
  }
  loading.value = true
  try {
    await resetAdminPassword(email.value)
    Notify.create({ type: 'positive', message: 'Te enviamos un correo para restablecer la contraseña' })
  } catch {
    Notify.create({ type: 'negative', message: 'No se pudo enviar el correo' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.admin-login-page {
  min-height: 100vh;
  padding: 24px 16px;
  background:
    radial-gradient(circle at 15% 15%, rgba(209, 151, 147, 0.16), transparent 45%),
    radial-gradient(circle at 85% 85%, rgba(233, 227, 202, 0.5), transparent 50%),
    #f5f5f5;
}

.login-wrap {
  width: 100%;
  max-width: 400px;
}

.login-brand {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo {
  height: 48px;
  object-fit: contain;
}

.login-logo-fallback {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #000;
}

.login-subtitle {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: #6b6b6b;
}

.login-card {
  background: #ffffff;
  border-radius: 18px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 16px 40px -12px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.login-card-section {
  padding: 32px 28px;
}

.login-title {
  font-weight: 700;
  color: #000;
}

.login-hint {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: #8a8a8a;
}

.login-field :deep(.q-field__control) {
  border-radius: 10px;
}

.login-submit {
  font-weight: 600;
  letter-spacing: 0.01em;
}
</style>
