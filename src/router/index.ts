import { defineRouter } from '#q-app'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { resolveAdminRedirect } from './adminGuard'

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to) => {
    if (!to.meta.requiresAdmin && !to.meta.adminGuest) return undefined
    // Solo las rutas del admin cargan Firebase (import dinámico: las páginas públicas no
    // lo bajan al arrancar). Auth restaura la sesión de forma async al cargar la página;
    // se espera esa primera resolución antes de decidir (evita un falso "no autenticado").
    const { isAdminSessionActive, waitForAdminAuthReady } = await import('@/utils/adminAuth')
    await waitForAdminAuthReady()
    return resolveAdminRedirect(to, isAdminSessionActive())
  })

  return Router
})
