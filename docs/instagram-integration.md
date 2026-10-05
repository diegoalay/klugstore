# Integración con Instagram (y descripciones con Claude)

Estado al 2026-10-05. Cuenta: **@sweethome.gt_** · App de Meta: **sweethome-store** (`2174344389825875`, portafolio Sweet Home, modo desarrollo).

| Pieza | Estado |
| --- | --- |
| Leer posts de Instagram → Firestore (`npm run sync:instagram`) | ✅ Implementado |
| Sincronización incremental con `lastSyncAt` / `lastPostedAt` | ✅ Implementado |
| Pantalla `/admin/instagram`: crear producto desde un post / ignorar | ✅ Implementado |
| `source` en productos creados desde Instagram | ✅ Implementado |
| Publicar en Instagram desde la tienda | 📐 Diseño (este documento) |
| Descripciones de producto con Claude (Anthropic) | 📐 Diseño (este documento) |
| Sincronización automática (sin correr el script a mano) | 📐 Diseño (este documento) |

---

## 1. Estructura de datos (Firestore)

Todos los identificadores y campos van en **inglés y camelCase**, igual que el resto de la base.

```text
stores/{storeSlug}
├── products/{productId}            público (lectura) · escritura admin
├── categories/{categorySlug}       público (lectura) · escritura admin
├── instagramPosts/{igMediaId}      PRIVADO (solo admin)
└── integrations/instagram          PRIVADO (solo admin)
```

### 1.1 `products/{productId}`: campo nuevo `source`

```ts
source?: {
  type: 'instagram'      // de dónde salió; ausente = creado a mano
  postId: string         // id del media en Instagram
  url: string            // permalink del post
}
```

- Los IDs siguen el esquema `{categoría}-{nn}` (`christmas-season-07`), también al crear desde el admin.
- Diseño (publicación, ver #3): se agregará `instagramPublication: { mediaId, permalink, publishedAt }`
  cuando un producto se publique desde la tienda.

### 1.2 `instagramPosts/{igMediaId}`

Lo escribe el script de sincronización; el admin solo cambia `status`/`productId`.

```ts
{
  caption: string          // texto original del post
  permalink: string
  postedAt: string         // ISO 8601, como lo da Instagram
  imageUrls: string[]      // CDN de Instagram: CADUCAN en pocos días
  syncedAt: Timestamp
  status: 'pending' | 'imported' | 'ignored'
  productId?: string       // si se creó un producto a partir del post
}
```

La sugerencia de nombre, precio, medida, categoría y "vendido" **no se guarda**: la calcula el admin al mostrar el post
(`src/utils/instagramCaption.ts`). Así, mejorar el lector del texto no requiere volver a sincronizar.

### 1.3 `integrations/instagram`

```ts
{
  lastSyncAt: Timestamp        // última corrida
  lastSyncMode: 'incremental' | 'full'
  lastPostedAt: string         // fecha del post más reciente visto (corte del modo incremental)
  lastSyncNewPosts: number
  // Diseño (#4):
  tokenExpiresAt?: Timestamp
  tokenRefreshedAt?: Timestamp
}
```

El **token** no vive aquí: es una credencial y la base la puede leer cualquier admin desde el navegador. Hoy está en
`.instagram-token` (local, en `.gitignore`); en la versión automática va a Secret Manager (#4).

### 1.4 Reglas de seguridad

`instagramPosts` e `integrations` solo se leen y escriben con sesión (`isAdmin()` en `firestore.rules`). Se verificó
que sin sesión responden 403. El registro público de Firebase Auth está deshabilitado, así que "con sesión" = admin.

---

## 2. Lo implementado

### Sincronización (`scripts/sync-instagram.mjs`)

```bash
npm run sync:instagram            # incremental: solo posts nuevos desde lastPostedAt
npm run sync:instagram -- --full  # todo: refresca textos y links de fotos
```

- API: Instagram API con inicio de sesión de Instagram, `GET graph.instagram.com/me/media`
  (campos `caption, media_type, media_url, permalink, timestamp, children{media_url}`), paginado de 50.
- La API devuelve de más nuevo a más viejo; el modo incremental corta al llegar a `lastPostedAt`.
- Solo se guardan posts con al menos una foto (los reels se saltan).
- Nunca pisa `status`/`productId`.
- Usar `--full` antes de crear productos de posts viejos: los links de fotos de Instagram caducan.

### Admin `/admin/instagram`

- Pestañas Pendientes / Creados / Ignorados, búsqueda en el texto y paginado de 48.
- Aviso **"Parecido a «…»"** si el nombre sugerido se parece a un producto existente
  (palabras en común; cantidades distintas como "Set de 3" vs "Set de 6" cuentan como productos distintos).
- **Crear producto** abre el mismo formulario del admin prellenado (nombre, precio, medida, categoría sugerida, vendido,
  fotos, `source`). Las fotos se copian a Storage **al guardar** (`persistExternalImages`), así que cancelar no deja
  archivos huérfanos. Al guardar, el post pasa a `imported` con su `productId`.

### Importación masiva inicial (2026-10-05, una sola vez)

Desde el post `DVMzRPyEVjv` (2026-02-25) hasta el 2026-10-04: **120 productos creados** (78 publicados y 42 vendidos
ocultos) con 840 fotos copiadas a Storage. Se saltaron 51: 3 sin precio (anuncios), 47 parecidos a productos que ya
existían y 1 sin categoría clara; quedan como pendientes en `/admin/instagram`. Se creó la categoría **Temporada
Navideña** (`christmas-season`).

---

## 3. Diseño: publicar en Instagram desde la tienda

**Objetivo:** botón "Publicar en Instagram" en el formulario del producto, que sube sus fotos y un texto al feed.

### Requisitos de Meta

- Permiso adicional **`instagram_business_content_publish`**. El token actual solo tiene lectura (a propósito):
  hay que volver a autorizar la app activando "Acceder al contenido y publicarlo".
- Las imágenes deben estar en una **URL pública** (Firebase Storage ya lo es) y en **JPEG**. Las fotos subidas
  como PNG/WebP habría que convertirlas antes.
- Límite de publicaciones por API en 24 h por cuenta (Meta lo documenta; verificar el número vigente antes de
  automatizar nada masivo).

### Flujo (API de publicación de contenido)

```text
1 foto:     POST /{ig-user-id}/media  { image_url, caption }                → container id
            POST /{ig-user-id}/media_publish { creation_id }                → media id

Carrusel:   POST /{ig-user-id}/media  { image_url, is_carousel_item: true } × n  (máx. 10)
            POST /{ig-user-id}/media  { media_type: CAROUSEL, children: [ids], caption }
            POST /{ig-user-id}/media_publish { creation_id }
```

### Dónde corre

**Nunca en el navegador** (el token permitiría publicar). Propuesta: Cloud Function *callable* `publishProductToInstagram`:

1. Verifica `context.auth` (admin).
2. Lee el producto, arma el caption (o usa el que generó Claude, #5) y las URLs de Storage.
3. Llama a la API con el token desde **Secret Manager**.
4. Guarda en el producto `instagramPublication: { mediaId, permalink, publishedAt }` y crea/actualiza el
   `instagramPosts/{mediaId}` como `imported` con su `productId`. Así el próximo sync no lo trata como post nuevo.

Requiere activar Cloud Functions en el proyecto (ya está en plan Blaze).

---

## 4. Diseño: sincronización automática

Hoy el sync se corre a mano. Versión automática:

- **Cloud Function programada** (Cloud Scheduler), p. ej. cada 6 h, con la misma lógica de `sync-instagram.mjs`
  (incremental) y una vez al día `--full` para renovar links de fotos.
- **Token en Secret Manager.** Los tokens de larga duración duran ~60 días y se renuevan con
  `GET graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`. La función lo renueva cuando
  `tokenRefreshedAt` tenga más de ~30 días, y guarda `tokenExpiresAt`/`tokenRefreshedAt` en `integrations/instagram`.
- El admin muestra "Última sincronización: …" leyendo `integrations/instagram.lastSyncAt`.

---

## 5. Diseño: descripciones con Claude (Anthropic)

**Objetivo:** botón "Mejorar con IA" en el formulario de producto que propone nombre, descripción, medida, etiquetas
y un caption para Instagram a partir de las **fotos** y del texto existente. El admin siempre revisa antes de guardar.

### Dónde corre

Cloud Function *callable* `generateProductCopy` (verifica sesión de admin). La API key de Anthropic va en
**Secret Manager** (`ANTHROPIC_API_KEY`), nunca en el cliente.

### Llamada

- API de Mensajes de Anthropic con las fotos como bloques de imagen por URL (Storage es público) + nombre,
  descripción, precio, categoría y el caption de Instagram original si existe.
- Modelo sugerido: **`claude-sonnet-5-5`** (buen balance calidad/costo para textos cortos con imágenes); evaluar
  `claude-haiku-4-5-20251001` si el volumen crece.
- Salida estructurada (JSON validado):

```ts
{
  name: string            // ≤ 60 caracteres, sin "VENDIDO", sin emojis
  description: string     // 1–3 frases
  measure: string | null  // solo si aparece en el texto o es inequívoco; nunca inventar medidas
  tags: string[]
  instagramCaption: string
  hashtags: string[]
}
```

### Guía de estilo para el prompt

- Español **neutro y formal**, sin voseo ("puede", no "podés").
- Tono de marca cálido y aspiracional (decoración del hogar, "ambientes cálidos").
- No inventar materiales, medidas ni cantidades que no se vean o no estén en el texto.
- Mencionar compra por WhatsApp y envíos en Guatemala solo en el caption de Instagram, no en la descripción.

### Ideas de uso

1. Al crear desde Instagram: limpiar los nombres que hoy salen de la primera frase del post
   (p. ej. "Añade el toque perfecto a tu cocina con nuestro icónico" → "Organizador de utensilios de acacia").
2. Corrida masiva para mejorar nombres de los 120 importados (con revisión por lotes en el admin).
3. Generar el caption al publicar en Instagram (#3).

---

## 6. Decisiones pendientes

- [ ] Re-autorizar con permiso de publicación (#3) cuando se decida construir esa parte.
- [ ] Activar Cloud Functions + Secret Manager (necesario para #3, #4 y #5).
- [ ] API key de Anthropic (cuenta de la empresa) para #5.
- [ ] ¿Mostrar piezas vendidas en la tienda como prueba social? (hoy se ocultan del listado).
