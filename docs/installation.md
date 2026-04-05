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

# Base URL del futuro backend klugsystem (hoy no se usa — el catálogo carga JSON estático)
VITE_API_BASE_URL=http://localhost:3000/api

# Password del panel /admin (MVP). Si se omite, cae a "sweethome".
# Username siempre es "admin".
VITE_ADMIN_PASSWORD=sweethome
```

Pon este archivo en la raíz del proyecto. Nunca lo commitees con credenciales
reales (`.env.local` y `.env.*.local` también están gitignored).

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

1. Navega a <http://localhost:9000/admin>
2. Usuario: `admin`
3. Password: el valor de `VITE_ADMIN_PASSWORD` (default: `sweethome`)

Los cambios que hagas se guardan como *overlay* en `localStorage`
(`ks-admin-catalog-overlay:sweethome`). Para resetear:

```js
localStorage.removeItem('ks-admin-catalog-overlay:sweethome')
localStorage.removeItem('ks-admin-auth')
```

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

4. Abre `data/products/sweethome.json`, busca el producto por `id` y agrega la
   URL al array `images[]`. La primera imagen del array es el preview; las
   demás alimentan el carrusel del detalle.

5. Rebuild + deploy: `npm run deploy`.

> **Importante**: los nombres de archivo **no deben tener espacios**. Firebase
> Hosting los manejaba mal históricamente y algunos clientes HTTP también.
> Siempre usa `kebab-case`.

### 6.2. Reemplazar una imagen existente

Simplemente sube el archivo con el mismo nombre al mismo prefijo del bucket.
**No necesitas rebuild ni redeploy** — el cache del navegador puede demorar en
refrescarse, pero el bucket ya sirve la nueva versión.

---

## 7. Dominio custom (DNS)

El dominio de producción es **`sweethome.com.gt`**, administrado en **AWS Route 53**.

### 7.1. Registros DNS requeridos

| Nombre | Tipo | Valor |
|---|---|---|
| `sweethome.com.gt` | A | *(las IPs que entregue Firebase Console al agregar el apex)* |
| `sweethome.com.gt` | TXT | `"hosting-site=sweet-home-gt" "<token-de-verificación>"` |
| `www.sweethome.com.gt` | CNAME | `sweet-home-gt.web.app` |

Los valores exactos los entrega Firebase Console al ir a
**Hosting → Add custom domain**. Primero se conecta `sweethome.com.gt` (apex) y
después `www.sweethome.com.gt` para que ambas variantes funcionen.

### 7.2. Verificar propagación

```bash
dig sweethome.com.gt TXT +short
dig www.sweethome.com.gt CNAME +short
```

Cuando los valores empiecen a responder, el botón **Verificar** de Firebase
Console emitirá el certificado SSL y activará el dominio. Suele tardar entre 15
minutos y 24 horas.

### 7.3. Agregar el dominio al store resolver

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

## 8. Scripts npm disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite + HMR) en `:9000` |
| `npm run build` | Build producción a `dist/spa/` |
| `npm run deploy` | Build + deploy a Firebase Hosting (producción) |
| `npm run deploy:preview` | Build + deploy a un channel temporal de Firebase |
| `npm run deploy:ipv4` | Igual que `deploy` pero forzando DNS IPv4 (para redes con IPv6 problemático) |
| `npm run lint` | ESLint sobre `src/` |
| `npm run format` | Prettier sobre todo el repo respetando `.gitignore` |

---

## 9. Troubleshooting frecuente

### 9.1. `npm install` falla con 401 en `@fortawesome/fontawesome-pro`

Falta `.npmrc` con el token válido (§2.1). Verifica también que el token no
haya expirado en el panel de Fort Awesome.

### 9.2. El admin no acepta contraseña

Revisa que `.env` tenga `VITE_ADMIN_PASSWORD=...` y que hayas reiniciado
`npm run dev` después de editar `.env` (Vite solo lee el `.env` al arrancar).

### 9.3. En producción veo la versión vieja después de un deploy

HTML debería tener `Cache-Control: max-age=0, must-revalidate` (lo setea
`firebase.json`). Verifica con:

```bash
curl -sI https://sweethome.com.gt/ | grep -i cache
curl -sI https://sweethome.com.gt/catalog | grep -i cache
```

Si algún route no lo tiene, probablemente la regla de headers no está cubriendo
ese path — agrégalo al array `headers` de `firebase.json`. Mientras tanto, un
`Cmd+Shift+R` (hard reload) refresca.

### 9.4. Las imágenes no cargan

- Abre una URL del array `images[]` directo en el browser — debe responder 200.
- Si responde 403, el objeto de S3 no tiene ACL pública o el bucket policy no
  permite `s3:GetObject` anónimo para ese prefijo. Verifica la policy del
  bucket.
- Si el nombre del archivo tiene espacios o caracteres raros, renómbralo.

### 9.5. "ENOENT" al hacer deploy después de rebuild

Quedó un cache stale de Firebase CLI:

```bash
rm -rf .firebase/ dist/
npm run deploy
```

### 9.6. CSP bloquea un recurso

El CSP está en `firebase.json` bajo `headers`. Si agregas un nuevo origen
(CDN, analytics, tracker, etc), añádelo a la directiva correcta
(`script-src`, `img-src`, `connect-src`, `font-src`) y redesplega.

---

## 10. Checklist para un deploy limpio

- [ ] `.env` tiene las variables necesarias
- [ ] `.npmrc` tiene el token válido de FA Pro
- [ ] `npm run lint` pasa sin errores
- [ ] `npm run build` termina con *Build succeeded*
- [ ] Revisa `data/products/sweethome.json` — ¿los productos que agregaste
      tienen `visible: true` y `images[]` con URLs válidas?
- [ ] Smoke test local: `npx quasar serve dist/spa --history` y navega
      `/catalog`, `/catalog/producto/<slug>`, `/about`, `/admin`.
- [ ] `npm run deploy`
- [ ] Verifica en producción que `curl -I` devuelve los headers correctos
- [ ] Hard reload y revisa que los cambios se ven
