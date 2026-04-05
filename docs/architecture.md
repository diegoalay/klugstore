# KlugStore — Arquitectura

## 1. Qué es KlugStore

**KlugStore** es un *builder* de catálogos digitales whitelabel pensado para tiendas
pequeñas y medianas que venden principalmente por Instagram y WhatsApp. La primera
tienda en producción es **SweetHome GT** (decoración del hogar, Guatemala).

La propuesta se resume en 4 ideas:

1. **El catálogo es público y sin fricción.** El cliente entra, navega, ve fotos
   buenas, elige y escribe por WhatsApp. Sin carrito, sin registro, sin checkout.
2. **La tienda es branding, no plantilla.** Cada tienda define logo, paleta, tono,
   redes y número de WhatsApp. El mismo motor de catálogo se viste distinto por
   tenant.
3. **Los assets viven fuera del frontend.** Las imágenes y logos se sirven desde
   S3 (CDN), así el bundle se mantiene ligero y se pueden actualizar fotos sin
   redesplegar.
4. **El frontend es un SPA simple que, a futuro, se conecta a un backend
   (`klugsystem`).** Hoy consume JSON estático; mañana consumirá API — el
   contrato de datos ya está preparado para esa transición.

### 1.1. Casos de uso principales

- **Cliente final**: explora productos, filtra por categoría, busca por nombre,
  abre detalle con carrusel de imágenes y presiona *Comprar* → se abre WhatsApp
  con un mensaje pre-armado (nombre del producto + precio formateado).
- **Dueño de tienda (MVP)**: entra a `/admin` con contraseña, puede editar
  nombre, descripción, precio, visibilidad, tags, medidas, descuento e imágenes
  de cada producto. Los cambios se guardan como *overlay* en `localStorage` —
  cuando el backend exista, este overlay se reemplaza por llamadas a la API.
- **Operador de la plataforma**: despliega nuevas tiendas replicando la
  estructura `data/products/{tienda}.json` y ajustando el mapeo de dominio en
  `storeResolver`.

### 1.2. Posicionamiento

KlugStore compite con plantillas de Shopify / Wix / Linktree "catálogo" apuntando
a un nicho muy concreto: **tiendas de nicho estético (decoración, regalo, moda,
hogar) que ya venden por Instagram/WhatsApp y no quieren/no necesitan un
e-commerce completo**, pero sí quieren una URL propia, bonita, rápida y con
SEO decente.

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework UI | **Vue 3** (Composition API + `<script setup>`) |
| Meta-framework | **Quasar 2** (Vite) |
| Lenguaje | **TypeScript** (strict, `exactOptionalPropertyTypes: true`) |
| Routing | **vue-router 4** (history mode) |
| Estado | **Pinia 2** |
| Iconos | **Font Awesome Pro 7** (solid, regular, light, thin, duotone, brands) |
| Estilos | **SCSS** + variables CSS runtime (`--ks-*`) |
| Bundler | **Vite 6** |
| Hosting | **Firebase Hosting** |
| CDN de assets | **AWS S3** (`klugsystem-public-storage`) |

> **Por qué Quasar y no Vue puro**: traemos componentes (QBtn, QCarousel,
> QDialog, QInput, QLayout) con a11y razonable, plugins (Notify, Loading,
> Dialog), iconset system y scaffolding (boot files, SPA/SSR/PWA modes) sin
> pagar el costo de montarlos a mano. El resto del código está escrito como Vue
> 3 "normal" para no amarrarnos innecesariamente a Quasar.

---

## 3. Estructura del repo

```
klugstore/
├── data/
│   ├── sweethome.pdf            # Catálogo original del cliente (referencia)
│   └── products/
│       └── sweethome.json       # Fuente de verdad del catálogo actual
├── docs/
│   ├── architecture.md          # Este documento
│   └── installation.md          # Guía de setup
├── public/
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── App.vue
│   ├── boot/
│   │   └── fontawesome-pro.ts   # Carga CSS de FA Pro (all styles + brands)
│   ├── composables/
│   │   ├── useCatalog.ts        # Hook para cargar catálogo (mock → API futura)
│   │   ├── useCatalogHash.ts    # Estado de filtros en el hash de la URL (#cat=&q=)
│   │   ├── usePageSeo.ts        # Título/description/canonical por ruta
│   │   └── useWhatsApp.ts       # Generar wa.me links con mensaje pre-armado
│   ├── css/
│   │   ├── app.scss             # Estilos globales + CSS variables de marca
│   │   └── quasar.variables.scss
│   ├── mocks/
│   │   └── catalog.mock.ts      # Lee data/products/sweethome.json y mapea a types
│   ├── modules/
│   │   ├── catalog/             # Módulo público (catálogo + detalle + about)
│   │   │   ├── CatalogLayout.vue
│   │   │   ├── components/      # ProductCard, ProductGrid, CategoryNav, StoreHeader
│   │   │   └── pages/           # HomePage, CategoryPage, ProductDetailPage, AboutPage
│   │   ├── admin/               # Módulo privado (MVP de edición)
│   │   │   └── AdminPage.vue
│   │   └── builder/             # (reservado para constructor visual futuro)
│   ├── pages/
│   │   └── ErrorNotFound.vue
│   ├── router/
│   │   ├── index.ts
│   │   └── routes.ts
│   ├── stores/
│   │   ├── catalog-store.ts     # Productos, categorías, filtro, búsqueda, orden
│   │   ├── store-config-store.ts# Config/branding/tema de la tienda cargada
│   │   └── index.ts             # Pinia factory (Quasar wrapper)
│   ├── types/
│   │   └── catalog.ts           # Product, Category, StoreConfig, StoreTheme...
│   └── utils/
│       ├── adminAuth.ts         # Auth del MVP de admin (username/password env)
│       ├── adminCatalogStorage.ts # Overlay local de ediciones del admin
│       ├── catalogData.ts       # Merge del JSON base con overlay de admin
│       ├── catalogSort.ts       # Modos de orden del catálogo
│       ├── slugify.ts           # Slug determinístico para URLs
│       └── storeResolver.ts     # hostname → slug de tienda
├── .env                         # VITE_APP_NAME, VITE_WHATSAPP_DEFAULT_NUMBER, ...
├── .npmrc                       # Token de Font Awesome Pro (gitignored)
├── firebase.json                # Hosting + headers (cache, CSP, HSTS, etc)
├── quasar.config.ts
└── package.json
```

---

## 4. Flujo de datos

### 4.1. Carga inicial del catálogo

```
Browser → main.ts (Quasar)
  → router → CatalogLayout.vue (onMounted)
    → resolveStoreSlug(hostname)                      // "sweethome"
    → useCatalog().loadCatalog(slug)
      → getMockCatalog(slug)                           // mocks/catalog.mock.ts
        → import sweethomeJson from data/products/sweethome.json
        → mapCatalog(rawJson)                          // transforma a Product[]
      → storeConfigStore.setConfig(catalog.store)      // aplica tema CSS
      → catalogStore.setCategories / setProducts
```

Cuando haya backend, solo cambia el cuerpo de `loadCatalog`:

```ts
// hoy
const data = getMockCatalog(slug)

// mañana
const data = await api.get(`/stores/${slug}/catalog`).then(r => r.data)
```

El resto del sistema no se entera.

### 4.2. Multi-tenancy por hostname

`src/utils/storeResolver.ts` decide qué tienda cargar **sin meter el slug en la
URL**. Reglas en orden:

| Hostname | Resuelve a |
|---|---|
| `sweethome.com.gt` / `www.sweethome.com.gt` | `sweethome` (mapeo explícito) |
| `sweet-home-gt.web.app` / `.firebaseapp.com` | `sweethome` (dominio de Firebase) |
| `{slug}.localhost` *(dev)* | `{slug}` |
| `localhost` / `127.0.0.1` *(dev sin subdominio)* | `sweethome` (default) |
| `{slug}.klugstore.app` / `.klugstore.com` *(futuro)* | `{slug}` |
| *cualquier otro* | `sweethome` (fallback) |

**Consecuencia**: las URLs públicas son siempre `/catalog`, `/catalog/producto/...`,
`/about`, `/admin`. Nunca `/{tienda}/catalog`.

### 4.3. Contrato de datos del catálogo (JSON)

```jsonc
{
  "store": "sweethome",
  "name": "SweetHome GT",
  "currency": "GTQ",
  "categories": [
    { "slug": "jarrones", "name": "Jarrones y Floreros", "icon": "fa-solid fa-wine-bottle", "order": 1 },
    ...
  ],
  "products": [
    {
      "id": "jarrones-03",
      "category": "jarrones",
      "name": "Set de 2 Jarrones Dona Negro y Zapote",
      "description": "...",
      "measure": "Grande 23 cm, Pequeña 20 cm",   // opcional
      "price": 300,
      "discount": null,                            // string libre o null
      "tags": ["jarrón", "dona", "negro", ...],
      "images": [
        "https://klugsystem-public-storage.../images/jarrones/jarron-3.jpeg",
        "https://klugsystem-public-storage.../images/jarrones/jarron-3-1.jpeg",
        ...
      ],
      "visible": true
    }
  ]
}
```

Reglas del contrato:

- **`images[0]` es la foto de preview.** Las demás (si hay) alimentan el carrusel
  lightbox del detalle.
- **`visible: false` oculta el producto** en la UI pública. Sirve para productos
  con info pero sin foto, productos descontinuados temporalmente, o borradores
  desde el admin.
- **`discount`** es texto libre con intención de marketing (`"-20%"`, `"2x1"`,
  `"Black Friday"`, `"Navidad"`). Si está presente aparece como badge sobre la
  imagen. Independiente de `compareAtPrice` (que hoy no se usa pero está en el
  tipo).
- **`measure`** es opcional; cuando falta, la UI simplemente no renderiza esa
  línea. No inventamos medidas — si el PDF original no las tiene, el campo se
  omite.

---

## 5. Estado (Pinia)

### 5.1. `catalog-store`

Estado reactivo del catálogo cargado. Responsabilidades:

- Guardar `products` y `categories` después del `loadCatalog()`.
- Exponer `filteredProducts` (computed) que aplica categoría activa + búsqueda +
  modo de orden (`catalogSort`).
- Exponer `featuredProducts` (destacados en el home).
- Helpers: `getProductBySlug`, `getCategoryBySlug`, `getProductsByCategory`,
  `getSortedProductsByCategory`.

### 5.2. `store-config-store`

Configuración y branding de la tienda actualmente cargada:

- `config` — `StoreConfig` completo (nombre, logo, redes, currency, tema...).
- `storeSlug` — slug computed; antes de cargar config, cae al `resolveStoreSlug()`
  del hostname.
- `seoTitleSuffix` — sufijo de `<title>` estilo `"Catálogo | SWEETHOME"`.
- `setConfig(config)` — setea y **aplica el tema** escribiendo CSS variables
  en `:root` (`--ks-primary`, `--ks-secondary`, `--ks-accent`, `--ks-bg`,
  `--ks-surface`, `--ks-text`, `--ks-text-secondary`, `--ks-radius`).

El tema se aplica **en runtime** porque el objetivo whitelabel es que cambiar
tienda = cambiar config, no cambiar CSS.

---

## 6. Rutas

```
/                                   → redirect a /catalog
/catalog                            → home del catálogo (listado + filtros + destacados)
/catalog/categoria/:categorySlug    → listado por categoría
/catalog/producto/:productSlug      → detalle con carrusel lightbox + CTA WhatsApp
/about                              → página "Sobre nosotros"
/admin                              → MVP de edición (auth por contraseña)
/*                                  → 404
```

`CatalogLayout.vue` es el layout compartido por `/catalog/*` y `/about` (header,
búsqueda, nav desktop/mobile, footer, FAB de WhatsApp).

---

## 7. SEO

Estrategia por capas:

1. **`index.html`** — meta estática (title/description/OG/Twitter/canonical) con
   contenido baseline para bots que no ejecutan JS. Incluye JSON-LD con
   `Brand` + `Organization` + `OnlineStore` + `WebSite` y un bloque `<noscript>`
   con el contenido real de la home (H1, H2, categorías, CTAs).
2. **`usePageSeo` composable** — por ruta, reescribe en runtime `document.title`,
   `<meta name="description">` y `<link rel="canonical">` usando título/descr
   computados por cada página (Home, Category, Product, About, 404). Productos
   sin match en el JSON setean `noIndex: true`.
3. **`public/sitemap.xml`** — listado estático de rutas públicas (home,
   /catalog, /about, categorías, productos *visible*). Se regenera en cada
   cambio estructural.
4. **`public/robots.txt`** — allow all, apunta al sitemap.
5. **`firebase.json` headers** — `Cache-Control: public, max-age=0,
   must-revalidate` para `index.html`, `/catalog*`, `/about` (HTML siempre
   revalida) y `max-age=31536000, immutable` para assets hashed.

---

## 8. Assets e imágenes (CDN pattern)

Las imágenes **no viven en el bundle**. Viven en S3:

```
s3://klugsystem-public-storage/sweethome/assets/
├── logos/
│   ├── sweethome-logo.webp
│   └── sweethome-logo-white.webp
└── images/
    ├── jarrones/
    ├── tablas_de_queso/
    ├── try_tablas_bandejas/
    ├── baja-platos/
    ├── candeleros/
    ├── temporada-otono/
    ├── utensilios-decoracion/
    └── esculturas/
```

URL base canónica (constante en `mocks/catalog.mock.ts`):

```
https://klugsystem-public-storage.s3.us-east-1.amazonaws.com/sweethome/assets/
```

**Ventajas**:

- Dist del frontend ≈ 4 MB (solo JS/CSS/HTML). Deploy en segundos.
- Puedes reemplazar fotos en S3 sin rebuild ni redeploy.
- El bucket sirve a otras tiendas bajo prefijos paralelos (`klugsystem-public-storage/{tienda}/assets/...`).
- El HTML hace `<link rel="preconnect">` al bucket para acelerar primera carga.

**Compresión**: pipeline acordado para nuevas fotos — máx 1600px lado largo,
JPEG calidad 80 (se logra con `sips` o el image optimizer de Vite).

---

## 9. Módulo admin (MVP)

`/admin` es un MVP pensado para que el dueño de la tienda pueda editar el
catálogo **sin tocar el JSON a mano**. Hoy:

- **Auth**: `username + password` (env `VITE_ADMIN_PASSWORD`). La sesión se
  guarda en `localStorage` bajo `ks-admin-auth`.
- **Storage**: los cambios se guardan como **overlay** en `localStorage` bajo
  `ks-admin-catalog-overlay:{slug}`. Es un diff contra el JSON base — solo los
  campos cambiados.
- **Merge**: `utils/catalogData.ts` aplica el overlay al JSON base antes de
  entregarlo al `catalog-store`. Si borras el overlay, vuelves al JSON original.
- **Campos editables** por producto: `name`, `description`, `price`, `visible`,
  `measure`, `discount`, `tags`, `images[]`.

Esto es claramente un **MVP temporal**. Cuando exista `klugsystem` como backend:

- La auth migra a JWT / OAuth.
- El overlay se reemplaza por llamadas a endpoints `PATCH /products/:id`.
- Los cambios serán multi-device y persistentes.

---

## 10. Decisiones clave (ADR resumido)

| Decisión | Por qué |
|---|---|
| **SPA Vue 3 + Quasar** en vez de Next/Nuxt SSR | Catálogo pequeño + contenido no hiper-dinámico + queremos deploy barato en Firebase Hosting. El SEO lo cubrimos con `<noscript>` + JSON-LD + meta runtime. Si a futuro las tiendas crecen mucho, migrar a SSR es local al proyecto. |
| **JSON en disco como fuente de verdad** | El cliente inicial (SweetHome) no tiene backend. El JSON con schema fijo es fácil de editar, versionar en git y reemplazar por una API cuando exista. |
| **Hostname → slug** sin prefijo en URL | Marketing quiere URLs limpias (`sweethome.com.gt/catalog`), y multi-tenant se logra por dominio custom. Mantiene SEO simple (un dominio = una tienda). |
| **Assets en S3 externo** | Evita que 130+ MB de fotos vivan en el bundle de Firebase. Permite a la operadora actualizar fotos sin PR. |
| **Tema runtime con CSS variables** | Permite cargar config de tienda desde JSON/API y aplicar branding sin rebuild. |
| **WhatsApp FAB + CTA por producto** | El público objetivo ya vende por WhatsApp. Meter carrito sería fricción innecesaria. |
| **Overlay admin en localStorage** | Permite iterar en la UX del editor antes de comprometerse con un backend. El contrato del overlay es simple de migrar a API. |
| **Font Awesome Pro** | Estilo `light`/`thin`/`duotone` encaja con marcas aspiracionales (decoración, moda). Free version se ve genérica. |

---

## 11. Futuro cercano

Features ya planeadas / en roadmap corto:

- **Conexión a `klugsystem`** (backend) — reemplazar `catalog.mock.ts` por cliente
  HTTP y eliminar overlay local.
- **Constructor visual whitelabel** (`modules/builder/`) — UI para crear y
  editar `StoreConfig` completo (paleta, logos, redes, tipografía).
- **Galería admin con subida directa a S3** (presigned URLs).
- **Analytics** — eventos de "ver producto", "clic WhatsApp", "buscar".
- **Múltiples idiomas** por tienda (i18n en `StoreConfig`).
- **PWA** — instalable como app, offline del catálogo.
