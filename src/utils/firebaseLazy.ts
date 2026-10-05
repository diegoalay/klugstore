/**
 * Carga diferida del SDK de Firebase (~170 KB gzip).
 *
 * Las páginas públicas son pre-renderizadas (SSG) y traen el catálogo en el HTML, así que
 * no necesitan Firebase para mostrarse. Todo lo que el público usa de Firebase (refresco
 * del catálogo en segundo plano, analytics y la detección de sesión de admin) importa el
 * SDK con `loadFirebase()`, nunca con un import estático de `@/boot/firebase`; así Vite lo
 * deja en un chunk aparte que se baja recién cuando hace falta. El admin (rutas lazy) sí
 * puede importarlo directo.
 */
type FirebaseModule = typeof import('@/boot/firebase')

let firebasePromise: Promise<FirebaseModule> | null = null

/** Importa (una sola vez) el módulo que inicializa app, Firestore, Storage, Auth y Analytics. */
export function loadFirebase(): Promise<FirebaseModule> {
  firebasePromise ??= import('@/boot/firebase')
  return firebasePromise
}

/** Resuelve cuando el navegador está libre (o a los `timeout` ms como máximo). En SSR, nunca. */
export function whenIdle(timeout = 2500): Promise<void> {
  if (typeof window === 'undefined') return new Promise(() => {})
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout })
    else setTimeout(resolve, Math.min(timeout, 1200))
  })
}

/** Carga Firebase cuando la página ya está interactiva y el navegador libre. */
export function loadFirebaseWhenIdle(): Promise<FirebaseModule> {
  return whenIdle().then(loadFirebase)
}
