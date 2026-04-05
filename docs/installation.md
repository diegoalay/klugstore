# KlugStore — Instalación y configuración

Guía paso a paso para clonar el proyecto, correrlo localmente y desplegarlo.

Para entender **qué es** KlugStore y cómo está estructurado, ver
[`architecture.md`](./architecture.md).

---

## 1. Requisitos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| **Node.js** | 20 LTS (24 recomendado) | `nvm use 20` si usas nvm |
| **npm** | 10+ | Ya viene con Node |
| **Quasar CLI** | 2.x | `npm i -g @quasar/cli` (opcional, Quasar se ejecuta vía `npx`) |
| **Firebase CLI** | última | `npm i -g firebase-tools` — solo si vas a desplegar |
| **Git** | cualquier versión reciente | |

Extras opcionales:

- **AWS CLI** — para sincronizar imágenes al bucket S3 (`klugsystem-public-storage`).
- **poppler-utils** (`brew install poppler`) — para extraer texto e imágenes de
  PDFs del cliente cuando se mapean nuevos catálogos (`pdftotext`, `pdfimages`).
- **sips** — nativo de macOS, se usa para redimensionar y recomprimir imágenes
  antes de subirlas a S3.

---

## 2. Clonar e instalar

```bash
git clone <repo-url> klugstore
cd klugstore
```

Antes de `npm install` necesitas dos archivos de credenciales que **no** están
en el repo (están en `.gitignore`):

### 2.1. `.npmrc` (Font Awesome Pro)

KlugStore usa **Font Awesome Pro**, instalado desde el registry privado de
Fort Awesome. Crea `.npmrc` en la raíz del proyecto:

```ini
@fortawesome:registry=https://npm.fontawesome.com/
//npm.fontawesome.com/:_authToken=<TU_TOKEN_DE_FA_PRO>
```

Si no tienes token, pídelo al dueño del proyecto o genera uno en
<https://fontawesome.com/account>. Sin este archivo `npm install` falla con
`401 Unauthorized` al intentar bajar `@fortawesome/fontawesome-pro`.

> **Seguridad**: el token no se commitea. `.npmrc` está en `.gitignore`.
> Para CI/CD, exporta `FONTAWESOME_NPM_AUTH_TOKEN` como variable de entorno y
> referenciala en el `.npmrc` como `${FONTAWESOME_NPM_AUTH_TOKEN}`.

### 2.2. `.env` (variables de app)

```ini
# Nombre de la app (aparece en logs y metadata)
VITE_APP_NAME=klugstore

# Número de WhatsApp default cuando la config de tienda no lo trae (formato E.164 sin +)
VITE_WHATSAPP_DEFAULT_NUMBER=50258705804

# Base URL del futuro backend klugsystem (hoy no se usa)
VITE_API_BASE_URL=http://localhost:3000/api

# Password del panel /admin (MVP). Si se omite, cae a "sweethome".
# Username siempre es "admin".
VITE_ADMIN_PASSWORD=sweethome

# Fuente del catálogo: Google Sheets (fuente activa en producción).
# Es el ID del sheet, no la URL completa. Ver §7 para cómo armar el sheet.
VITE_CATALOG_SHEETS_ID=1Yxx_td8sfDoIJfXKskRsiXo-Ph2EfZiEw4kYo365ORw

# (opcional) Fuente alternativa: JSON remoto en S3/CDN.
# Si se define, se usa cuando Sheets no está disponible.
# VITE_CATALOG_REMOTE_BASE=https://klugsystem-public-storage.s3.us-east-1.amazonaws.com
```

Pon este archivo en la raíz del proyecto. Nunca lo commitees con credenciales
reales (`.env.local` y `.env.*.local` también están gitignored).

> **Prioridad de fuentes del catálogo**: si `VITE_CATALOG_SHEETS_ID` está
> definido, ese Google Sheet es la fuente activa. Si no está o falla el fetch,
> el app cae a `VITE_CATALOG_REMOTE_BASE` (JSON remoto). Si eso también falla,
> usa el JSON empaquetado `data/products/{slug}.json` como red de seguridad.
> Más detalle en [`architecture.md`](./architecture.md#4-flujo-de-datos).

### 2.3. Instalar dependencias

```bash
npm install
```

El `postinstall` ejecuta `quasar prepare` automáticamente y genera el
`.quasar/tsconfig.json` con los aliases (`src`, `app`, etc).

---

## 3. Correr en desarrollo

```bash
npm run dev
```

Abre <http://localhost:9000/catalog>. Vite recarga al guardar archivos.

### 3.1. Multi-tenant en desarrollo

El resolver de tienda (`src/utils/storeResolver.ts`) reconoce subdominios
`*.localhost`. Para simular que estás en otra tienda sin tocar código:

- `http://localhost:9000/catalog` → tienda `sweethome` (default)
- `http://sweethome.localhost:9000/catalog` → tienda `sweethome`
- `http://<nuevo-slug>.localhost:9000/catalog` → cargaría la tienda `<nuevo-slug>`
  (siempre y cuando exista `data/products/<nuevo-slug>.json` y esté conectada en
  el mock)

En macOS/Linux `*.localhost` funciona sin editar `/etc/hosts` en la mayoría de
navegadores modernos.

### 3.2. Usar el panel admin en dev

1. Navega a <http://localhost:9000/admin/catalogo> (o `/admin`, que redirige)
2. Usuario: `admin`
3. Password: el valor de `VITE_ADMIN_PASSWORD` (default: `sweethome`)

Las ediciones en el admin **no se guardan en el navegador**: solo sirven para
**Exportar** (JSON overlay o CSV). La sesión de login usa `sessionStorage`
(`ks-admin-auth`); al cerrar la pestaña o pulsar Salir hay que volver a entrar.

Para volcar cambios al repo: descarga el overlay JSON y ejecuta
`npm run catalog:apply-overlay`.

---

## 4. Build de producción

```bash
npm run build
```

Salida en `dist/spa/`. Es un SPA estático — cualquier static host funciona, pero
el proyecto está configurado para **Firebase Hosting**.

Para servir el build localmente (para smoke test):

```bash
npx quasar serve dist/spa --history
```

---

## 5. Deploy a Firebase Hosting

### 5.1. Primera vez (setup)

Si nunca te has autenticado con Firebase en esta máquina:

```bash
firebase login
```

Verifica que el proyecto está configurado:

```bash
firebase projects:list
```

Debe aparecer `sweethome-gt` con project ID `sweet-home-gt`. El proyecto
actual está fijado en `.firebaserc`:

```json
{ "projects": { "default": "sweet-home-gt" } }
```

### 5.2. Deploy

```bash
npm run deploy
```

Este script corre `quasar build && firebase deploy --only hosting`. El dist
completo pesa ~4 MB (las imágenes vienen del CDN S3, no del bundle), así que el
upload toma segundos.

URL de producción default: <https://sweet-home-gt.web.app>.
Dominio custom: **<https://sweethome.com.gt>** (ver §7).

### 5.3. Deploy preview (channel)

Para subir una versión de prueba sin afectar producción:

```bash
npm run deploy:preview
```

Firebase genera una URL temporal (`https://sweet-home-gt--preview-xxxx.web.app`)
que expira en 7 días.

### 5.4. Si el deploy falla con "Unexpected error"

- **Limpia el cache de Firebase** — `rm -rf .firebase/ && rm -rf dist/ && npm run deploy`.
- **Usa IPv4** si estás en una red problemática: `npm run deploy:ipv4`.
- **Revisa `firebase-debug.log`** — grep por `ENOENT` o `ECONN` te dice si el
  error es por archivo faltante o red.

---

## 6. Assets (imágenes y logos) en S3

Las imágenes del catálogo **no están en el repo** ni en el bundle. Viven en:

```
s3://klugsystem-public-storage/sweethome/assets/
├── logos/
└── images/{categoria}/
```

URL pública base:

```
https://klugsystem-public-storage.s3.us-east-1.amazonaws.com/sweethome/assets/
```

### 6.1. Agregar una nueva imagen a un producto existente

1. Redimensiona la foto a máx 1600 px lado largo, JPEG calidad 80:

   ```bash
   sips -Z 1600 -s formatOptions 80 mi-foto.jpeg
   ```

2. Renombra siguiendo la convención slug `{categoria}-{NN}.jpeg` o `{original}-{N}.jpeg`
   (sin espacios, sin mayúsculas, sin caracteres especiales).

3. Sube al bucket bajo la carpeta correcta
   (`sweethome/assets/images/{categoria}/`). Consola web de AWS o:

   ```bash
   aws s3 cp mi-foto.jpeg s3://klugsystem-public-storage/sweethome/assets/images/jarrones/
   ```

4. Abre el Google Sheet del catálogo (ver §7), busca el producto por `id`
   en la pestaña `products`, y agrega la URL al campo `images` separada por
   coma de las URLs existentes. La primera URL es el preview; las demás
   alimentan el carrusel del detalle.

5. **No hace falta redeploy** — al refrescar el sitio, los cambios del sheet
   aparecen en 1-5 min (Google cachea el endpoint público).

> **Tip**: si quieres que los cambios se reflejen también en el JSON
> empaquetado (fallback), corre `npm run catalog:export-sheets` y re-pega
> los CSVs al JSON, o haz un deploy después — no es obligatorio pero mantiene
> el snapshot de git en sync con lo que ve el usuario.

> **Importante**: los nombres de archivo **no deben tener espacios**. Firebase
> Hosting los manejaba mal históricamente y algunos clientes HTTP también.
> Siempre usa `kebab-case`.

### 6.2. Reemplazar una imagen existente

Simplemente sube el archivo con el mismo nombre al mismo prefijo del bucket.
**No necesitas rebuild ni redeploy** — el cache del navegador puede demorar en
refrescarse, pero el bucket ya sirve la nueva versión.

---

## 7. Editar el catálogo (Google Sheets)

La fuente activa del catálogo en producción es un **Google Sheet**. Los
cambios que haga el editor se reflejan en el sitio **sin necesidad de
redeploy** (tarda 1-5 min por el cache público de Google).

**Sheet de SweetHome**:
<https://docs.google.com/spreadsheets/d/1Yxx_td8sfDoIJfXKskRsiXo-Ph2EfZiEw4kYo365ORw>

### 7.1. Para el editor no-técnico

Hay una guía dedicada con la descripción de cada columna, cómo agregar y
ocultar productos, aplicar descuentos, troubleshooting, etc.:

👉 [`docs/editor-guide.md`](./editor-guide.md)

### 7.2. Crear un sheet nuevo (para una tienda adicional)

1. **Exportar el catálogo actual a CSV**:

   ```bash
   npm run catalog:export-sheets
   ```

   Genera `tmp/sheets-export/{slug}-products.csv` y `{slug}-categories.csv`.
   Desde el panel admin (`/admin/catalogo`) también hay un botón **Exportar →
   Ambos CSV (Sheets)** que baja los mismos archivos según lo que tengas en el
   formulario del admin en ese momento.

2. **Crear un Google Sheet** con 2 pestañas exactamente llamadas `products`
   y `categories` (minúsculas, sin espacios).

3. **Pegar** cada CSV en su pestaña correspondiente (Cmd+A → Cmd+C → Cmd+V
   en A1 del sheet). Google detecta las columnas automáticamente.

4. **Compartir** el sheet: botón "Compartir" → "Acceso general" → "Cualquier
   persona con el enlace" → **Lector**. Es obligatorio; sin acceso público
   el endpoint `gviz/tq` devuelve HTML de login y el fetch falla.

5. **Copiar el ID** del sheet de la URL:

   ```
   https://docs.google.com/spreadsheets/d/<ESTE_ES_EL_ID>/edit
   ```

6. **Pegar en `.env`**:

   ```ini
   VITE_CATALOG_SHEETS_ID=<el-id-que-copiaste>
   ```

7. **Rebuild + deploy**: `npm run deploy`.

### 7.3. Verificar que el sheet responde correctamente

Antes de deployar, comprobá que los 2 endpoints públicos devuelven CSV
válido desde tu terminal:

```bash
SHEET_ID="<tu-id>"
curl -sI "https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=products"
curl -sI "https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=categories"
```

Ambos deben responder:

- `HTTP/2 200`
- `content-type: text/csv; charset=utf-8`

Si devuelven `text/html`, el sheet no está compartido públicamente o las
pestañas no se llaman `products`/`categories`.

### 7.4. Flujo de ediciones del día a día

1. El editor entra al sheet y modifica lo que necesite
2. Google auto-guarda
3. Espera 1-5 minutos (cache de Google del endpoint público)
4. Refresh forzado del sitio (`Cmd+Shift+R`)
5. Los cambios están ahí, sin redeploy

Los cambios **no se persisten al JSON empaquetado automáticamente**. Si
queres mantener el snapshot de git sincronizado con lo que ve el usuario,
corre `npm run catalog:export-sheets` periódicamente y pisa
`data/products/sweethome.json`. No es obligatorio — el JSON empaquetado es
solo el fallback si Google se cae.

### 7.5. Fallback automático

Si el sheet tiene un error (pestaña renombrada, permiso revocado, columnas
corruptas, Google caído), el app **cae automáticamente** al JSON empaquetado
del último deploy. La tienda nunca se rompe — lo peor que pasa es que se
muestra la versión del último snapshot y aparecen warnings en la consola del
browser para debug.

---

## 8. Dominio custom (DNS)

El dominio de producción es **`sweethome.com.gt`**, administrado en **AWS Route 53**.

### 8.1. Registros DNS requeridos

| Nombre | Tipo | Valor |
|---|---|---|
| `sweethome.com.gt` | A | *(las IPs que entregue Firebase Console al agregar el apex)* |
| `sweethome.com.gt` | TXT | `"hosting-site=sweet-home-gt" "<token-de-verificación>"` |
| `www.sweethome.com.gt` | CNAME | `sweet-home-gt.web.app` |

Los valores exactos los entrega Firebase Console al ir a
**Hosting → Add custom domain**. Primero se conecta `sweethome.com.gt` (apex) y
después `www.sweethome.com.gt` para que ambas variantes funcionen.

### 8.2. Verificar propagación

```bash
dig sweethome.com.gt TXT +short
dig www.sweethome.com.gt CNAME +short
```

Cuando los valores empiecen a responder, el botón **Verificar** de Firebase
Console emitirá el certificado SSL y activará el dominio. Suele tardar entre 15
minutos y 24 horas.

### 8.3. Agregar el dominio al store resolver

Si el dominio nuevo no estaba en `storeResolver.ts`, agrégalo al `DOMAIN_MAP`:

```ts
const DOMAIN_MAP: Record<string, string> = {
  'sweethome.com.gt': 'sweethome',
  'www.sweethome.com.gt': 'sweethome',
  // ...nuevos dominios aquí
}
```

Rebuild + redeploy para que el mapeo llegue a producción.

---

## 9. Scripts npm disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite + HMR) en `:9000` |
| `npm run build` | Genera sitemap + build producción a `dist/spa/` |
| `npm run deploy` | Build + deploy a Firebase Hosting (producción) |
| `npm run deploy:preview` | Build + deploy a un channel temporal de Firebase |
| `npm run generate:sitemap` | Regenera `public/sitemap.xml` desde el catálogo actual |
| `npm run catalog:export-sheets` | Exporta `data/products/{slug}.json` a CSVs listos para pegar en Google Sheets (§7) |
| `npm run catalog:apply-overlay` | Aplica un overlay JSON (exportado desde el admin o una ruta manual) sobre `data/products/{slug}.json` |
| `npm run lint` | ESLint sobre `src/` |
| `npm run format` | Prettier sobre todo el repo respetando `.gitignore` |

---

## 10. Troubleshooting frecuente

### 10.1. `npm install` falla con 401 en `@fortawesome/fontawesome-pro`

Falta `.npmrc` con el token válido (§2.1). Verifica también que el token no
haya expirado en el panel de Fort Awesome.

### 10.2. El admin no acepta contraseña

Revisa que `.env` tenga `VITE_ADMIN_PASSWORD=...` y que hayas reiniciado
`npm run dev` después de editar `.env` (Vite solo lee el `.env` al arrancar).

### 10.3. El catálogo sigue mostrando datos viejos aunque edité el Google Sheet

Chequeo en 3 pasos:

1. **Google cachea el endpoint público 1-5 minutos.** Esperá y hacé
   `Cmd+Shift+R` para forzar refresh.
2. **Verifica que el sheet sigue compartido como "Cualquiera con el enlace:
   Lector".** Si alguien cambió el permiso a "Restringido", el endpoint
   devuelve HTML de login y el app cae al JSON empaquetado sin avisar.
3. **Abre DevTools → Console.** Si ves warnings tipo `[sheets] respuesta es
   HTML, no CSV` o `[sheets] fetch falló`, eso confirma que el app está
   usando el fallback. Revisa el permiso del sheet o que las pestañas se
   llamen exactamente `products` y `categories`.

### 10.4. Un producto editado en el sheet no aparece

- Revisa que `visible` sea `TRUE` (no `true`, no `1`, aunque también se
  aceptan; lo importante es que no sea `FALSE` ni vacío con default distinto).
- Revisa que `category` coincida **exactamente** con un `slug` de la pestaña
  `categories`. Sin tildes, en minúsculas, con guiones.
- Revisa que `images` no esté vacío — productos sin imágenes se filtran.
- Revisa que `price` sea un número (sin `Q`, sin coma decimal, sin espacios).

### 10.5. En producción veo la versión vieja después de un deploy

HTML debería tener `Cache-Control: max-age=0, must-revalidate` (lo setea
`firebase.json`). Verifica con:

```bash
curl -sI https://sweethome.com.gt/ | grep -i cache
curl -sI https://sweethome.com.gt/catalog | grep -i cache
```

Si algún route no lo tiene, probablemente la regla de headers no está cubriendo
ese path — agrégalo al array `headers` de `firebase.json`. Mientras tanto, un
`Cmd+Shift+R` (hard reload) refresca.

### 10.6. Las imágenes no cargan

- Abre una URL del array `images[]` directo en el browser — debe responder 200.
- Si responde 403, el objeto de S3 no tiene ACL pública o el bucket policy no
  permite `s3:GetObject` anónimo para ese prefijo. Verifica la policy del
  bucket.
- Si el nombre del archivo tiene espacios o caracteres raros, renómbralo.

### 10.7. "ENOENT" al hacer deploy después de rebuild

Quedó un cache stale de Firebase CLI:

```bash
rm -rf .firebase/ dist/
npm run deploy
```

### 10.8. CSP bloquea un recurso

El CSP está en `firebase.json` bajo `headers`. Si agregas un nuevo origen
(CDN, analytics, tracker, etc), añádelo a la directiva correcta
(`script-src`, `img-src`, `connect-src`, `font-src`) y redesplega.

---

## 11. Checklist para un deploy limpio

- [ ] `.env` tiene las variables necesarias (`VITE_CATALOG_SHEETS_ID` si
      la fuente es Sheets, `VITE_ADMIN_PASSWORD`, etc.)
- [ ] `.npmrc` tiene el token válido de FA Pro
- [ ] `npm run lint` pasa sin errores
- [ ] Si cambiaste el sheet: verifica con `curl` que los 2 endpoints
      `gviz/tq` responden `200` + `text/csv` (§7.3)
- [ ] `npm run build` termina con *Build succeeded*
- [ ] Si agregaste productos en el JSON de fallback, revisa que tengan
      `visible: true` y `images[]` con URLs válidas
- [ ] Smoke test local: `npx quasar serve dist/spa --history` y navega
      `/catalog`, `/catalog/producto/<slug>`, `/about`, `/admin/catalogo`.
- [ ] `npm run deploy`
- [ ] Verifica en producción que `curl -I` devuelve los headers correctos
- [ ] Hard reload y revisa que los cambios se ven
- [ ] Abre DevTools → Console en producción. No debe haber warnings
      `[sheets] ...` — si aparecen, el app está usando fallback en lugar
      del sheet activo
