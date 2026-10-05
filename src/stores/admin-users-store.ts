import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, getDocs, orderBy, query, type Timestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, db } from '@/boot/firebase'
import { resolveCatalogSlug } from '@/utils/catalogData'
import type { AdminProfile } from '@/utils/adminRoles'

export interface AdminUser extends AdminProfile {
  uid: string
  createdAt: Date | null
}

export interface NewAdminUser {
  email: string
  displayName: string
  password: string
  role: number
}

type AdminUserPatch = Partial<Pick<AdminUser, 'displayName' | 'role' | 'active'>>

/**
 * Usuarios del admin (stores/{store}/users). La lista se lee directo de Firestore;
 * crear/editar/eliminar pasa por Cloud Functions porque tocan Firebase Auth
 * (registro público deshabilitado) y validan que quien llama sea administrador.
 */
export const useAdminUsersStore = defineStore('adminUsers', () => {
  const users = ref<AdminUser[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  const call = <T>(name: string) => httpsCallable<T, { uid: string }>(getFunctions(app), name)

  async function load() {
    loading.value = true
    try {
      const snap = await getDocs(
        query(collection(db, 'stores', resolveCatalogSlug(), 'users'), orderBy('createdAt', 'asc')),
      )
      users.value = snap.docs.map((d) => {
        const data = d.data() as AdminProfile & { createdAt?: Timestamp }
        return { ...data, uid: d.id, createdAt: data.createdAt?.toDate() ?? null }
      })
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function create(input: NewAdminUser) {
    await call<NewAdminUser>('createAdminUser')(input)
    await load()
  }

  async function update(uid: string, patch: AdminUserPatch) {
    await call<AdminUserPatch & { uid: string }>('updateAdminUser')({ uid, ...patch })
    await load()
  }

  async function remove(uid: string) {
    await call<{ uid: string }>('deleteAdminUser')({ uid })
    users.value = users.value.filter((u) => u.uid !== uid)
  }

  return { users, loading, loaded, load, create, update, remove }
})

/** Mensaje legible de un error de las Cloud Functions (vienen en español desde el servidor). */
export function adminUsersErrorMessage(err: unknown, fallback: string): string {
  const e = err as { code?: string; message?: string } | null
  if (e?.code?.startsWith('functions/') && e.code !== 'functions/internal' && e.message) {
    return e.message
  }
  return fallback
}
