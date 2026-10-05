import { defineSsgGetPages, defineSsgRenderPreloadTag } from '#q-app';
import routes from '@/router/routes';
import { fetchCatalogFromFirestore } from '@/utils/firestoreAdapter';
import { productSlug } from '@/utils/slugify';

/**
 * Páginas a generar: las rutas fijas (catálogo, nosotros, privacidad) más una
 * por categoría y por producto visible, leídas de Firestore (fuente de verdad).
 * La URL de producto sale de productSlug(), la misma función que usa la app.
 * Los vendidos también se generan: su ficha sigue accesible por link directo.
 * El admin no se pre-renderiza (ver ssg.clientSideRenderingRoutes).
 */
export const getSsgPages = defineSsgGetPages(async ({ parseVueRouterRoutes }) => {
  const { ssgPages } = await parseVueRouterRoutes({ routes, verbose: false });
  const staticPages = ssgPages.filter((p) => !p.route.startsWith('/admin'));

  const catalog = await fetchCatalogFromFirestore('sweethome');
  if (!catalog) throw new Error('No se pudo leer el catálogo de Firestore para el SSG');

  return [
    ...staticPages,
    ...catalog.categories.map((c) => ({
      route: `/catalog/categoria/${c.slug}`,
      label: `categoría ${c.name}`,
    })),
    ...catalog.products
      .filter((p) => p.visible !== false)
      .map((p) => ({ route: `/catalog/producto/${productSlug(p.name, p.id)}`, label: p.name })),
  ];
});

const jsRE = /\.js$/
const cssRE = /\.css$/
const woffRE = /\.woff$/
const woff2RE = /\.woff2$/
const gifRE = /\.gif$/
const jpgRE = /\.jpe?g$/
const pngRE = /\.png$/

/**
 * Should return a String with HTML output
 * (if any) for preloading indicated file
 */
export const renderPreloadTag = defineSsgRenderPreloadTag(
  (file /* , { ssrContext } */) => {
    if (jsRE.test(file)) {
      return `<link rel="modulepreload" href="${file}" crossorigin>`;
    }

    if (cssRE.test(file)) {
      return `<link rel="stylesheet" href="${file}" crossorigin>`;
    }

    if (woffRE.test(file)) {
      return `<link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`;
    }

    if (woff2RE.test(file)) {
      return `<link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`;
    }

    if (gifRE.test(file)) {
      return `<link rel="preload" href="${file}" as="image" type="image/gif" crossorigin>`;
    }

    if (jpgRE.test(file)) {
      return `<link rel="preload" href="${file}" as="image" type="image/jpeg" crossorigin>`;
    }

    if (pngRE.test(file)) {
      return `<link rel="preload" href="${file}" as="image" type="image/png" crossorigin>`;
    }

    return '';
  }
);
