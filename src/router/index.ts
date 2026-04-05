import { defineRouter } from '#q-app/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { isAdminSessionActive } from 'src/utils/adminCatalogStorage'

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach((to, _from, next) => {
    if (to.meta.requiresAdmin && !isAdminSessionActive()) {
      next({ name: 'admin-login', query: { redirect: to.fullPath } })
      return
    }
    if (to.meta.adminGuest && isAdminSessionActive()) {
      next({ name: 'admin-catalog' })
      return
    }
    next()
  })

  return Router
})
