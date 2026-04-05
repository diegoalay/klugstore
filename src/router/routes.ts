import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/catalog',
  },
  {
    path: '/catalog',
    component: () => import('src/modules/catalog/CatalogLayout.vue'),
    children: [
      {
        path: '',
        name: 'catalog-home',
        component: () => import('src/modules/catalog/pages/HomePage.vue'),
        meta: { title: 'Catálogo' },
      },
      {
        path: 'categoria/:categorySlug',
        name: 'catalog-category',
        component: () => import('src/modules/catalog/pages/CategoryPage.vue'),
        meta: { title: 'Categoría' },
      },
      {
        path: 'producto/:productSlug',
        name: 'catalog-product',
        component: () => import('src/modules/catalog/pages/ProductDetailPage.vue'),
        meta: { title: 'Producto' },
      },
    ],
  },
  {
    path: '/about',
    component: () => import('src/modules/catalog/CatalogLayout.vue'),
    children: [
      {
        path: '',
        name: 'about',
        component: () => import('src/modules/catalog/pages/AboutPage.vue'),
        meta: { title: 'Sobre SweetHome' },
      },
    ],
  },
  {
    path: '/admin',
    component: () => import('src/modules/admin/AdminLayout.vue'),
    redirect: { name: 'admin-catalog' },
    children: [
      {
        path: 'login',
        name: 'admin-login',
        component: () => import('src/modules/admin/pages/AdminLoginPage.vue'),
        meta: { adminGuest: true },
      },
      {
        path: 'catalogo',
        name: 'admin-catalog',
        component: () => import('src/modules/admin/pages/AdminCatalogPage.vue'),
        meta: { requiresAdmin: true },
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('src/pages/ErrorNotFound.vue'),
  },
]

export default routes
