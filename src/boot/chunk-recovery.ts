/**
 * Recuperación tras un deploy: Firebase Hosting borra los assets de la versión
 * anterior, así que una pestaña abierta antes del deploy pide chunks que ya no
 * existen y la navegación se rompe. Se detecta ese fallo y se recarga la página
 * una sola vez, con lo que el navegador baja el index.html nuevo.
 *
 *  - `vite:preloadError`: falló una dependencia precargada de un import().
 *  - `router.onError`: falló el import() del componente de la ruta.
 *
 * El candado en sessionStorage evita un bucle si el servidor mismo está caído.
 * Ambos handlers usan la MISMA clave (URL absoluta): con claves distintas se
 * alternan y recargan sin parar (pasó en lealklub-app).
 */
import { defineBoot } from '#q-app'

const STALE_CHUNK =
  /Failed to fetch dynamically imported module|Importing a module script failed|Unable to preload CSS|error loading dynamically imported module/i
const LOCK_KEY = 'sh_chunk_reload'
const LOCK_MS = 15_000

/** true si se disparó la recarga; false si ya se intentó hace poco para esa URL. */
export function reloadOnce(targetHref: string): boolean {
  try {
    const raw = sessionStorage.getItem(LOCK_KEY)
    const lock = raw ? (JSON.parse(raw) as { href: string; at: number }) : null
    if (lock && lock.href === targetHref && Date.now() - lock.at < LOCK_MS) return false
    sessionStorage.setItem(LOCK_KEY, JSON.stringify({ href: targetHref, at: Date.now() }))
  } catch {
    // sin storage: recargar igual, el riesgo de bucle es bajo
  }
  location.assign(targetHref)
  return true
}

export function isStaleChunkError(error: unknown): boolean {
  return STALE_CHUNK.test(String((error as Error)?.message ?? error))
}

export default defineBoot(({ router }) => {
  if (typeof window === 'undefined') return

  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnce(location.href)) event.preventDefault()
  })

  router.onError((error, to) => {
    if (!isStaleChunkError(error)) return
    // Recargar directo en el destino: al volver, la ruta resuelve con los chunks nuevos.
    reloadOnce(new URL(to.fullPath, location.origin).href)
  })
})
