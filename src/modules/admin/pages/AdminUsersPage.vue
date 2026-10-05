<template>
  <q-page class="admin-page">
    <div class="users-wrap">
      <q-inner-loading :showing="usersStore.loading && !usersStore.loaded" color="dark" />

      <div class="users-topbar">
        <div>
          <div class="users-eyebrow"><q-icon name="fa-solid fa-users" size="13px" /> Usuarios</div>
          <div class="users-title">Administradores del panel</div>
          <div class="users-note">
            Solo estas cuentas pueden entrar al admin. Por ahora hay un rol: Administrador, con
            acceso a todo.
          </div>
        </div>
        <q-btn
          unelevated
          no-caps
          color="dark"
          icon="fa-solid fa-user-plus"
          label="Nuevo administrador"
          class="admin-btn"
          @click="openCreate"
        />
      </div>

      <div class="users-list">
        <div
          v-for="user in usersStore.users"
          :key="user.uid"
          class="user-row"
          :class="{ 'is-off': !user.active }"
        >
          <div class="user-avatar">{{ initials(user.displayName || user.email) }}</div>
          <div class="user-main">
            <div class="user-name">
              {{ user.displayName || 'Sin nombre' }}
              <span v-if="user.uid === myUid" class="user-you">Tú</span>
            </div>
            <div class="user-email">{{ user.email }}</div>
          </div>
          <div class="user-meta">
            <span class="user-role">{{ roleLabel(user.role) }}</span>
            <span class="user-state" :class="user.active ? 'is-on' : 'is-off'">
              {{ user.active ? 'Activo' : 'Desactivado' }}
            </span>
          </div>
          <div class="user-actions">
            <q-btn
              flat
              round
              color="grey-8"
              icon="fa-solid fa-pen"
              class="admin-btn-sm"
              @click="openEdit(user)"
            >
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              color="grey-8"
              icon="fa-solid fa-key"
              class="admin-btn-sm"
              @click="sendReset(user)"
            >
              <q-tooltip>Enviar correo para cambiar la contraseña</q-tooltip>
            </q-btn>
            <q-btn
              v-if="user.uid !== myUid"
              flat
              round
              color="grey-8"
              :icon="user.active ? 'fa-solid fa-user-slash' : 'fa-solid fa-user-check'"
              class="admin-btn-sm"
              @click="toggleActive(user)"
            >
              <q-tooltip>{{ user.active ? 'Desactivar' : 'Reactivar' }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="user.uid !== myUid"
              flat
              round
              color="negative"
              icon="fa-solid fa-trash"
              class="admin-btn-sm"
              @click="confirmDelete(user)"
            >
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </div>
        </div>

        <div v-if="usersStore.loaded && !usersStore.users.length" class="users-empty">
          No hay administradores registrados.
        </div>
      </div>
    </div>

    <q-dialog v-model="dialogOpen" :maximized="$q.screen.lt.sm">
      <q-card class="user-form">
        <div class="user-form-header">
          <div>
            <div class="users-eyebrow">
              {{ editing ? 'Editar administrador' : 'Nuevo administrador' }}
            </div>
            <div class="user-form-title">
              {{ draft.displayName || draft.email || 'Sin nombre' }}
            </div>
          </div>
          <q-btn
            round
            flat
            icon="fa-solid fa-xmark"
            color="grey-7"
            class="admin-btn-sm"
            @click="dialogOpen = false"
          />
        </div>

        <q-form class="user-form-body" @submit.prevent="save">
          <q-input
            v-model="draft.displayName"
            outlined
            label="Nombre"
            :rules="[(v: string) => v.trim().length >= 2 || 'Escribe el nombre']"
            lazy-rules
          />
          <q-input
            v-model="draft.email"
            outlined
            type="email"
            label="Correo"
            :readonly="!!editing"
            :hint="editing ? 'El correo no se puede cambiar' : ''"
            :rules="[
              (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Correo inválido',
            ]"
            lazy-rules
          />
          <q-input
            v-if="!editing"
            v-model="draft.password"
            outlined
            :type="showPassword ? 'text' : 'password'"
            label="Contraseña temporal"
            hint="Compártela con la persona; puede cambiarla con «¿Olvidaste tu contraseña?»"
            :rules="[(v: string) => v.length >= 8 || 'Mínimo 8 caracteres']"
            lazy-rules
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
              <q-icon
                name="fa-solid fa-wand-magic-sparkles"
                class="cursor-pointer q-ml-sm"
                @click="generatePassword"
              >
                <q-tooltip>Generar contraseña</q-tooltip>
              </q-icon>
            </template>
          </q-input>
          <q-select
            v-model="draft.role"
            outlined
            emit-value
            map-options
            label="Rol"
            :options="ADMIN_ROLES.map((r) => ({ value: r.value, label: r.label }))"
          />

          <div class="user-form-footer">
            <q-btn
              unelevated
              no-caps
              type="submit"
              color="dark"
              :label="editing ? 'Guardar cambios' : 'Crear administrador'"
              :loading="saving"
              class="admin-btn"
            />
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { usePageSeo } from '@/composables/usePageSeo'
import { getCurrentAdmin, resetAdminPassword } from '@/utils/adminAuth'
import { ADMIN_ROLES, ROLE_ADMIN, roleLabel } from '@/utils/adminRoles'
import {
  adminUsersErrorMessage,
  useAdminUsersStore,
  type AdminUser,
} from '@/stores/admin-users-store'

usePageSeo({
  title: 'Usuarios | Admin',
  description: 'Administradores del panel.',
  path: '/admin/usuarios',
  noIndex: true,
})

const usersStore = useAdminUsersStore()
const myUid = computed(() => getCurrentAdmin()?.uid ?? '')

const dialogOpen = ref(false)
const editing = ref<AdminUser | null>(null)
const saving = ref(false)
const showPassword = ref(false)
const draft = reactive<{ displayName: string; email: string; password: string; role: number }>({
  displayName: '',
  email: '',
  password: '',
  role: ROLE_ADMIN,
})

onMounted(() => {
  if (!usersStore.loaded) void usersStore.load()
})

function initials(text: string) {
  return text
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

function openCreate() {
  editing.value = null
  Object.assign(draft, { displayName: '', email: '', password: '', role: ROLE_ADMIN })
  showPassword.value = false
  dialogOpen.value = true
}

function openEdit(user: AdminUser) {
  editing.value = user
  Object.assign(draft, {
    displayName: user.displayName,
    email: user.email,
    password: '',
    role: user.role,
  })
  dialogOpen.value = true
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(12))
  draft.password = Array.from(bytes, (n) => chars[n % chars.length]).join('')
  showPassword.value = true
}

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await usersStore.update(editing.value.uid, {
        displayName: draft.displayName.trim(),
        role: draft.role,
      })
      Notify.create({ type: 'positive', message: 'Administrador actualizado' })
    } else {
      await usersStore.create({
        displayName: draft.displayName.trim(),
        email: draft.email.trim(),
        password: draft.password,
        role: draft.role,
      })
      Notify.create({
        type: 'positive',
        message: 'Administrador creado. Comparte la contraseña temporal.',
      })
    }
    dialogOpen.value = false
  } catch (err) {
    Notify.create({ type: 'negative', message: adminUsersErrorMessage(err, 'No se pudo guardar') })
  } finally {
    saving.value = false
  }
}

async function toggleActive(user: AdminUser) {
  try {
    await usersStore.update(user.uid, { active: !user.active })
    Notify.create({
      message: user.active ? 'Administrador desactivado' : 'Administrador reactivado',
    })
  } catch (err) {
    Notify.create({
      type: 'negative',
      message: adminUsersErrorMessage(err, 'No se pudo cambiar el estado'),
    })
  }
}

async function sendReset(user: AdminUser) {
  try {
    await resetAdminPassword(user.email)
    Notify.create({
      type: 'positive',
      message: `Enviamos un correo a ${user.email} para cambiar la contraseña`,
    })
  } catch {
    Notify.create({ type: 'negative', message: 'No se pudo enviar el correo' })
  }
}

function confirmDelete(user: AdminUser) {
  Dialog.create({
    title: '¿Eliminar administrador?',
    message: `${user.displayName || user.email} ya no podrá entrar al admin y su cuenta se borrará. Si solo quiere quitarle el acceso por un tiempo, use «Desactivar».`,
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true, noCaps: true },
  }).onOk(() => {
    usersStore
      .remove(user.uid)
      .then(() => Notify.create({ message: 'Administrador eliminado' }))
      .catch((err) =>
        Notify.create({
          type: 'negative',
          message: adminUsersErrorMessage(err, 'No se pudo eliminar'),
        }),
      )
  })
}
</script>

<style scoped lang="scss">
.users-wrap {
  position: relative;
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
}

.users-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.users-eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d19793;
}

.users-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin-top: 2px;
}

.users-note {
  font-size: 0.8rem;
  color: #8a8a8a;
  margin-top: 4px;
  max-width: 560px;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;

  &.is-off {
    opacity: 0.6;
  }
}

.user-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #f3e6e5;
  color: #b56f6a;
  font-weight: 700;
  font-size: 0.85rem;
}

.user-main {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.user-you {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  background: #000;
  color: #fff;
}

.user-email {
  font-size: 0.82rem;
  color: #6b6b6b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-role,
.user-state {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.user-role {
  background: #f5f1ea;
  color: #6b5a3a;
}

.user-state.is-on {
  background: #e6f6ec;
  color: #1f7a45;
}

.user-state.is-off {
  background: #f1f1f1;
  color: #6b6b6b;
}

.user-actions {
  display: flex;
  gap: 2px;
}

.users-empty {
  padding: 32px;
  text-align: center;
  color: #8a8a8a;
}

.user-form {
  width: 100%;
  max-width: 460px;
  border-radius: 18px;
}

.user-form-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 6px;
}

.user-form-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: 2px;
}

.user-form-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 20px 20px;
}

.user-form-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

@media (max-width: 599px) {
  .users-wrap {
    padding: 16px 12px;
  }

  .user-row {
    flex-wrap: wrap;
  }

  .user-meta {
    order: 3;
    width: 100%;
    padding-left: 54px;
  }

  .user-form {
    max-width: none;
    border-radius: 0;
  }
}
</style>
