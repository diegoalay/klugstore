import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

/**
 * Decide la redirección de rutas del admin. `undefined` = dejar pasar.
 * - requiresAdmin sin sesión → login, recordando a dónde quería ir.
 * - adminGuest (login) con sesión → directo al panel.
 */
export function resolveAdminRedirect(
  to: Pick<RouteLocationNormalized, 'meta' | 'fullPath'>,
  hasSession: boolean,
): RouteLocationRaw | undefined {
  if (to.meta.requiresAdmin && !hasSession) {
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  }
  if (to.meta.adminGuest && hasSession) {
    return { name: 'admin-catalog' }
  }
  return undefined
}
