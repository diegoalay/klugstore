import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/catalog',
  },
  {
    path: '/catalog',
    component: () => import('@/modules/catalog/CatalogLayout.vue'),
    children: [
      {
        path: '',
        name: 'catalog-home',
        component: () => import('@/modules/catalog/pages/HomePage.vue'),
        meta: { title: 'Catálogo' },
      },
      {
        path: 'categoria/:categorySlug',
        name: 'catalog-category',
        component: () => import('@/modules/catalog/pages/CategoryPage.vue'),
        meta: { title: 'Categoría' },
      },
      {
        path: 'producto/:productSlug',
        name: 'catalog-product',
        component: () => import('@/modules/catalog/pages/ProductDetailPage.vue'),
        meta: { title: 'Producto' },
      },
    ],
  },
  {
    path: '/about',
    component: () => import('@/modules/catalog/CatalogLayout.vue'),
    children: [
      {
        path: '',
        name: 'about',
        component: () => import('@/modules/catalog/pages/AboutPage.vue'),
        meta: { title: 'Sobre SweetHome' },
      },
    ],
  },
  {
    path: '/preguntas-frecuentes',
    component: () => import('@/modules/catalog/CatalogLayout.vue'),
    children: [
      {
        path: '',
        name: 'faq',
        component: () => import('@/modules/catalog/pages/FaqPage.vue'),
        meta: { title: 'Preguntas frecuentes' },
      },
    ],
  },
  {
    path: '/privacidad',
    component: () => import('@/modules/catalog/CatalogLayout.vue'),
    children: [
      {
        path: '',
        name: 'privacy',
        component: () => import('@/modules/catalog/pages/PrivacyPage.vue'),
        meta: { title: 'Privacidad' },
      },
    ],
  },
  {
    path: '/admin',
    component: () => import('@/modules/admin/AdminLayout.vue'),
    redirect: { name: 'admin-catalog' },
    children: [
      {
        path: 'login',
        name: 'admin-login',
        component: () => import('@/modules/admin/pages/AdminLoginPage.vue'),
        meta: { adminGuest: true },
      },
      {
        path: 'catalogo',
        name: 'admin-catalog',
        component: () => import('@/modules/admin/pages/AdminCatalogPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'instagram',
        name: 'admin-instagram',
        component: () => import('@/modules/admin/pages/AdminInstagramPage.vue'),
        meta: { requiresAdmin: true },
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
]

export default routes
