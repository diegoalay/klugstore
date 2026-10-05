import { defineRouter } from '#q-app'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { isAdminSessionActive, waitForAdminAuthReady } from '@/utils/adminAuth'
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
    if (to.meta.requiresAdmin || to.meta.adminGuest) {
      // Firebase Auth restaura la sesión de forma async al cargar la página;
      // esperamos esa primera resolución antes de decidir (evita un falso
      // "no autenticado" en el primer render tras un refresh).
      await waitForAdminAuthReady()
    }
    return resolveAdminRedirect(to, isAdminSessionActive())
  })

  return Router
})
