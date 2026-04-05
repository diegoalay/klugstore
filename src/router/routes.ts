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
    path: '/:catchAll(.*)*',
    component: () => import('src/pages/ErrorNotFound.vue'),
  },
]

export default routes
