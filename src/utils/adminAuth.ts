import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/boot/firebase'
import { resolveCatalogSlug } from '@/utils/catalogData'
import { isActiveAdmin, type AdminProfile } from '@/utils/adminRoles'

/**
 * Acceso al admin: sesión de Firebase Auth + perfil en stores/{store}/users/{uid} con
 * role 0 (administrador) y active true. Las cuentas solo se crean desde el admin
 * (Cloud Function createAdminUser); el registro público está deshabilitado.
 */
export class AdminAccessDeniedError extends Error {
  code = 'admin/access-denied'
  constructor() {
    super('Tu cuenta no tiene acceso al admin')
  }
}

let currentProfile: AdminProfile | null = null

async function loadProfile(user: User | null): Promise<AdminProfile | null> {
  if (!user) return null
  try {
    const snap = await getDoc(doc(db, 'stores', resolveCatalogSlug(), 'users', user.uid))
    return snap.exists() ? (snap.data() as AdminProfile) : null
  } catch {
    return null
  }
}

export async function signInAdmin(email: string, password: string): Promise<void> {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  currentProfile = await loadProfile(user)
  if (!isActiveAdmin(currentProfile)) {
    currentProfile = null
    await signOut(auth)
    throw new AdminAccessDeniedError()
  }
}

export async function signOutAdmin(): Promise<void> {
  currentProfile = null
  await signOut(auth)
}

export async function resetAdminPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export function getCurrentAdmin(): User | null {
  return auth.currentUser
}

export function isAdminSessionActive(): boolean {
  return auth.currentUser !== null && isActiveAdmin(currentProfile)
}

let authReadyPromise: Promise<void> | undefined

/**
 * Firebase Auth restaura la sesión de forma asíncrona al cargar la página.
 * El guard de rutas espera esa primera resolución (y el perfil con el rol) antes
 * de decidir si redirige a /admin/login.
 */
export function waitForAdminAuthReady(): Promise<void> {
  authReadyPromise ??= new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      void loadProfile(user).then((profile) => {
        currentProfile = profile
        resolve()
      })
    })
  })
  return authReadyPromise
}
