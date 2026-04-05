# KlugStore — Arquitectura

## 1. Qué es KlugStore

**KlugStore** es un *builder* de catálogos digitales whitelabel pensado para tiendas
pequeñas y medianas que venden principalmente por Instagram y WhatsApp. La primera
tienda en producción es **SweetHome GT** (decoración del hogar, Guatemala).

La propuesta se resume en 5 ideas:

1. **El catálogo es público y sin fricción.** El cliente entra, navega, ve fotos
   buenas, elige y escribe por WhatsApp. Sin carrito, sin registro, sin checkout.
2. **La tienda es branding, no plantilla.** Cada tienda define logo, paleta, tono,
   redes y número de WhatsApp. El mismo motor de catálogo se viste distinto por
   tenant.
3. **Los assets viven fuera del frontend.** Las imágenes y logos se sirven desde
   S3 (CDN), así el bundle se mantiene ligero y se pueden actualizar fotos sin
   redesplegar.
4. **El catálogo también vive fuera del frontend.** La fuente activa es un
   Google Sheet que cualquier editor no-técnico puede mantener. El app lo baja
   en runtime vía el endpoint público `gviz/tq`, así los cambios de precio,
   stock o fotos se reflejan en minutos sin redeploy.
5. **El frontend es un SPA simple, backend-ready.** Hoy consume Google Sheets
   con fallback a JSON empaquetado; cuando llegue `klugsystem` (backend real),
   solo cambia la capa de fetch — el contrato de datos ya está preparado.

### 1.1. Casos de uso principales

- **Cliente final**: explora productos, filtra por categoría, busca por nombre,
  abre detalle con carrusel de imágenes y presiona *Comprar* → se abre WhatsApp
  con un mensaje pre-armado (nombre del producto + precio formateado).
- **Dueño de tienda (MVP)**: entra a `/admin/catalogo` (o `/admin`, que redirige)
  con contraseña, puede editar
  nombre, descripción, precio, visibilidad, tags, medidas, descuento e imágenes
  de cada producto. Los cambios **no persisten** en el navegador: se exportan
  como JSON/CSV y el backend futuro reemplazará ese flujo por API.
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
│       └── sweethome.json       # Snapshot de fallback (la fuente activa
│                                # es un Google Sheet — ver §4)
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
│   │   ├── useCatalog.ts        # Hook de carga con 3 fuentes + reloadCatalog()
│   │   ├── useCatalogHash.ts    # Estado de filtros en el hash de la URL (#cat=&q=)
│   │   ├── usePageSeo.ts        # Título/description/canonical por ruta
│   │   ├── useProductQuickView.ts # Estado del diálogo de vista rápida de producto
│   │   └── useWhatsApp.ts       # Generar wa.me links con mensaje pre-armado
│   ├── css/
│   │   ├── app.scss             # Estilos globales + CSS variables de marca
│   │   └── quasar.variables.scss
│   ├── mocks/
│   │   └── catalog.mock.ts      # Orquesta la carga (Sheets → JSON remoto → bundled)
│   │                            # y mapea raw JSON a los tipos de la app
│   ├── modules/
│   │   ├── catalog/             # Módulo público (catálogo + detalle + about)
│   │   │   ├── CatalogLayout.vue
│   │   │   ├── components/
│   │   │   │   ├── ProductCard.vue          # Tarjeta del grid con badge sold/discount
│   │   │   │   ├── ProductGrid.vue          # Grid responsive + scroll reveal
│   │   │   │   ├── ProductDetailView.vue    # Vista compartida: detalle + quick-view dialog
│   │   │   │   ├── ProductQuickViewDialog.vue  # Modal del quick view (desde el grid)
│   │   │   │   ├── CategoryNav.vue          # Chips de categorías con scroll horizontal
│   │   │   │   ├── CatalogSortSelect.vue    # Selector de modo de orden
│   │   │   │   └── StoreHeader.vue          # Banner + nombre/descripción de la tienda
│   │   │   └── pages/
│   │   │       ├── HomePage.vue             # Listado principal + destacados
│   │   │       ├── CategoryPage.vue         # Listado por categoría
│   │   │       ├── ProductDetailPage.vue    # Wrapper delgado (SEO + back link) → ProductDetailView
│   │   │       └── AboutPage.vue            # Historia de la marca
│   │   ├── admin/               # Módulo privado (MVP de edición)
│   │   │   ├── AdminLayout.vue  # Shell + router-view; logout limpia Pinia
│   │   │   └── pages/           # AdminLoginPage, AdminCatalogPage
│   │   └── builder/             # (reservado para constructor visual futuro)
│   ├── pages/
│   │   └── ErrorNotFound.vue
│   ├── router/
│   │   ├── index.ts
│   │   └── routes.ts
│   ├── stores/
│   │   ├── catalog-store.ts     # Productos, categorías, filtro, búsqueda, orden
│   │   ├── store-config-store.ts# Config/branding/tema de la tienda cargada
│   │   ├── admin-catalog-draft-store.ts # Borrador catálogo admin (memoria; reset al logout)
│   │   └── index.ts             # Pinia factory (Quasar wrapper)
│   ├── types/
│   │   └── catalog.ts           # Product, Category, StoreConfig, StoreTheme...
│   └── utils/
│       ├── adminAuth.ts         # Auth del MVP de admin (username/password env)
│       ├── adminCatalogStorage.ts # Sesión admin + construcción de overlay para export
│       ├── catalogData.ts       # resolveRawCatalog con 3 fuentes (Sheets/remoto/bundled)
│       ├── catalogSort.ts       # Modos de orden del catálogo
│       ├── googleSheetsAdapter.ts # Parser CSV + fetch de Sheets via gviz/tq
│       ├── slugify.ts           # Slug determinístico para URLs
│       └── storeResolver.ts     # hostname → slug de tienda
├── scripts/
│   ├── export-catalog-to-csv.mjs  # JSON → 2 CSVs listos para pegar en Sheets
│   ├── generate-sitemap.mjs       # Sitemap automático pre-build
│   └── apply-admin-overlay-to-json.mjs # Aplicar overlay JSON exportado al JSON en disco
├── .env                         # VITE_APP_NAME, VITE_CATALOG_SHEETS_ID, ...
├── .npmrc                       # Token de Font Awesome Pro (gitignored)
├── firebase.json                # Hosting + headers (cache, CSP, HSTS, etc)
├── quasar.config.ts
└── package.json
```

---

## 4. Flujo de datos

### 4.1. Carga inicial del catálogo

```
Browser → Quasar boot
  → router → CatalogLayout.vue (onMounted)
    → resolveStoreSlug(hostname)                      // "sweethome"
    → useCatalog().loadCatalog(slug)
      → loadCatalogFromSource(slug)                    // mocks/catalog.mock.ts
        → resolveRawCatalog(slug)                      // utils/catalogData.ts
           ├─ 1. fetchCatalogFromSheets()              // googleSheetsAdapter.ts
           │    └─ gviz/tq CSV x2 → parse → RawCatalog
           ├─ 2. fetchRemoteCatalogJson(slug)          // JSON en S3/CDN
           └─ 3. getRawCatalogJson(slug)               // JSON empaquetado
      → buildCatalogData(raw, slug)                    // raw → Product[]
    → storeConfigStore.setConfig(catalog.store)        // aplica tema CSS
    → catalogStore.setCategories / setProducts
```

### 4.2. Tres fuentes, un solo contrato

La función `resolveRawCatalog(slug)` intenta las 3 fuentes en orden de
prioridad. Cualquiera que falle cae silenciosamente a la siguiente:

| # | Fuente | Condición para activarse | Propósito |
|---|---|---|---|
| 1 | **Google Sheets** | `VITE_CATALOG_SHEETS_ID` definido | Fuente **viva** editada por el cliente no-técnico. El app la lee en cada carga. |
| 2 | **JSON remoto (S3/CDN)** | `VITE_CATALOG_REMOTE_BASE` definido | Alternativa si Sheets no aplica (otro editor más técnico, API estable, etc). |
| 3 | **JSON empaquetado** (siempre) | `data/products/{slug}.json` existe | Red de seguridad: snapshot del último deploy. Garantiza que el sitio **nunca** muestre pantalla vacía. |

La capa de resolución es agnóstica al consumidor — `useCatalog.loadCatalog()`
solo ve un `RawCatalog` y no sabe de dónde vino.

Cuando llegue `klugsystem` (backend real), solo se agrega una fuente #0 por
encima de Sheets y se mantiene el resto como fallback para desarrollo y
robustez. El contrato `RawCatalog` no cambia.

### 4.3. Google Sheets como fuente activa

El editor no-técnico trabaja contra un **único** Google Sheet con 2 pestañas:

```
📄 Sheet (ID: VITE_CATALOG_SHEETS_ID)
   ├── products    ← id, category, name, description, measure, price,
   │                 visible, featured, discount, tags, images
   └── categories  ← slug, name, icon, order
```

El adaptador (`src/utils/googleSheetsAdapter.ts`) usa el endpoint público
`gviz/tq` de Google para consultar cada pestaña por nombre:

```
https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&sheet=products
https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&sheet=categories
```

**Por qué `gviz/tq` en vez de "Publicar en la web"**:

- Un **único ID** en vez de 2 URLs con `gid` impredecibles
- **CORS habilitado** por default (funciona desde el browser)
- Las pestañas se referencian por **nombre**, no por número de tab
- No requiere "publicar" el sheet — solo compartirlo como "Cualquiera con el enlace: Lector"
- Si renombras pestañas o cambias el orden, no se rompe (siempre que los 2
  nombres sean `products` y `categories`)

**Requisitos del sheet**:

- Permiso: "Cualquiera con el enlace: Lector" (obligatorio, si no `gviz`
  devuelve HTML de login)
- 2 pestañas con nombres exactos `products` y `categories` (minúsculas)
- Primera fila de cada pestaña son los headers (nombres de columna)

**Propagación**: Google cachea el endpoint público ~1-5 min. Los cambios en el
sheet no son instantáneos pero tampoco requieren redeploy.

**Formato de listas** (tags, images): separados por `,` dentro de una celda.
Google Sheets envuelve automáticamente esas celdas en comillas al exportar a
CSV porque contienen comas — el editor solo escribe `jarrón, dona, negro` en
la celda y el adaptador parsea correctamente.

**Validación defensiva**: el adaptador detecta respuestas HTML (sheet privado
o pestañas inexistentes) y cae al fallback sin romper el sitio. Los warnings
quedan en la consola del browser para debug.

### 4.4. Multi-tenancy por hostname

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
`/about`, `/admin` o `/admin/catalogo`. Nunca `/{tienda}/catalog`.

### 4.5. Contrato de datos del catálogo (JSON/CSV)

```jsonc
{
  "store": "sweethome",
  "name": "SweetHome GT",
  "currency": "GTQ",
  "categories": [
    // `icon` acepta forma corta (`wine-bottle`) o completa (`fa-solid fa-wine-bottle`).
    // El normalizador interno antepone `fa-solid fa-` a los nombres cortos.
    { "slug": "jarrones", "name": "Jarrones y Floreros", "icon": "wine-bottle", "order": 1 },
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
      "visible": true,
      "sold": false                                // opcional; default false
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
- **`sold: true` marca el producto como vendido** — sigue siendo *visible* en
  el catálogo (con badge "Vendido" sobre la imagen y acción de compra
  deshabilitada) pero no se puede comprar. Sirve como prueba social ("ya
  vendimos esto") y para que el cliente pueda pedir algo similar. Los
  productos `sold: true` nunca aparecen como `featured`.
- **`discount`** es texto libre con intención de marketing (`"-20%"`, `"2x1"`,
  `"Black Friday"`, `"Navidad"`). Si está presente aparece como badge sobre la
  imagen. Independiente de `compareAtPrice` (que hoy no se usa pero está en el
  tipo). Se oculta cuando `sold: true`.
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
/admin                              → layout admin; redirect a `/admin/catalogo`
/admin/login                        → acceso (guest); si ya hay sesión → `/admin/catalogo`
/admin/catalogo                     → edición (guard: sesión admin obligatoria)
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

`/admin/catalogo` (URL canónica; `/admin` redirige) es un MVP para editar el
catálogo **sin tocar el JSON a mano**. Hoy:

- **Auth**: `username + password` (env `VITE_ADMIN_PASSWORD`). La sesión se
  guarda en `sessionStorage` bajo `ks-admin-auth`.
- **Persistencia**: el catálogo en tienda viene solo de Sheets / JSON remoto /
  JSON empaquetado. El borrador del editor vive en **Pinia** (`adminCatalogDraft`)
  mientras la sesión admin está activa; **Salir** llama a `reset()` y vacía el
  store. Solo **Exportar** genera overlay JSON o CSV. La carga usa la misma
  cadena que la tienda (`resolveRawCatalog`).
- **Campos editables** por producto: `name`, `description`, `price`, `visible`,
  `sold`, `measure`, `discount`, `tags`, `images[]`.
- **Exportar**: menú **Exportar** — overlay JSON, CSV de productos (borrador
  actual del formulario), CSV de categorías (JSON empaquetado) o ambos CSV
  seguidos — mismo esquema que `npm run catalog:export-sheets`.

Esto es claramente un **MVP temporal**. Cuando exista `klugsystem` como backend:

- La auth migra a JWT / OAuth.
- El overlay se reemplaza por llamadas a endpoints `PATCH /products/:id`.
- Los cambios serán multi-device y persistentes.

---

## 10. Decisiones clave (ADR resumido)

| Decisión | Por qué |
|---|---|
| **SPA Vue 3 + Quasar** en vez de Next/Nuxt SSR | Catálogo pequeño + contenido no hiper-dinámico + queremos deploy barato en Firebase Hosting. El SEO lo cubrimos con `<noscript>` + JSON-LD + meta runtime. Si a futuro las tiendas crecen mucho, migrar a SSR es local al proyecto. |
| **Google Sheets como fuente viva + JSON como fallback** | El cliente no tiene backend ni recursos técnicos para mantener un CMS. Sheets es familiar, gratis, versionado, colaborativo y con UI nativa. El JSON empaquetado queda como red de seguridad (último snapshot) para que el sitio nunca se rompa si Google está caído o el sheet tiene un error. |
| **Hostname → slug** sin prefijo en URL | Marketing quiere URLs limpias (`sweethome.com.gt/catalog`), y multi-tenant se logra por dominio custom. Mantiene SEO simple (un dominio = una tienda). |
| **Assets en S3 externo** | Evita que 130+ MB de fotos vivan en el bundle de Firebase. Permite a la operadora actualizar fotos sin PR. |
| **Tema runtime con CSS variables** | Permite cargar config de tienda desde JSON/API y aplicar branding sin rebuild. |
| **WhatsApp FAB + CTA por producto** | El público objetivo ya vende por WhatsApp. Meter carrito sería fricción innecesaria. |
| **Overlay solo por export (sin persistencia local del catálogo)** | Evita que la tienda y el admin diverjan en `localStorage`. El JSON exportado sigue siendo el contrato natural para `apply-overlay` y para una futura API. |
| **`ProductDetailView` como componente separado de `ProductDetailPage`** | La vista del detalle se reusa en dos contextos: página propia (`/catalog/producto/:slug`) y *quick view* modal desde el grid. La página es un wrapper delgado que maneja ruteo, SEO y back link; la vista recibe `product` por prop y emite `ask-similar`. |
| **Font Awesome Pro** | Estilo `light`/`thin`/`duotone` encaja con marcas aspiracionales (decoración, moda). Free version se ve genérica. |

---

## 11. Futuro cercano

Features ya planeadas / en roadmap corto:

- **Conexión a `klugsystem`** (backend) — agregar una fuente #0 arriba de
  Sheets con API real; Sheets queda como opción para tiendas pequeñas.
- **Constructor visual whitelabel** (`modules/builder/`) — UI para crear y
  editar `StoreConfig` completo (paleta, logos, redes, tipografía).
- **Galería admin con subida directa a S3** (presigned URLs) — hoy el editor
  tiene que pasar las URLs de S3 ya generadas.
- **Botón "Re-sync Sheets"** en `/admin/catalogo` — forzar re-fetch del sheet sin
  esperar el cache de Google (útil tras ediciones grandes).
- **Validador de sheet en `/admin/catalogo`** — detectar filas con `category` inválida,
  URLs rotas, tipos incorrectos, etc. antes de que lleguen al sitio público.
- **Analytics** — eventos de "ver producto", "clic WhatsApp", "buscar".
- **Múltiples idiomas** por tienda (i18n en `StoreConfig` + columnas `name_en`,
  `description_en` en el sheet).
- **PWA** — instalable como app, offline del catálogo.
