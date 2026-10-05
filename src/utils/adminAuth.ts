import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { auth } from '@/boot/firebase'

/**
 * Login con Firebase Auth. Todo usuario es admin: el registro público está
 * deshabilitado en el proyecto, así que las cuentas solo se crean desde
 * Firebase Console → Authentication → Users.
 */
export async function signInAdmin(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth)
}

export async function resetAdminPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export function getCurrentAdmin(): User | null {
  return auth.currentUser
}

export function isAdminSessionActive(): boolean {
  return auth.currentUser !== null
}

let authReadyPromise: Promise<void> | undefined

/**
 * Firebase Auth restaura la sesión de forma asíncrona al cargar la página.
 * El guard de rutas espera esa primera resolución antes de decidir si
 * redirige a /admin/login.
 */
export function waitForAdminAuthReady(): Promise<void> {
  authReadyPromise ??= new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe()
      resolve()
    })
  })
  return authReadyPromise
}
