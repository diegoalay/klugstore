# Guía del editor del catálogo (Google Sheets)

Esta guía es para la persona que va a **editar los productos** del catálogo
(nombres, precios, descripciones, fotos, visibilidad) sin necesidad de tocar
código. El catálogo vive en un **Google Sheet** y el sitio lo lee
automáticamente cada vez que alguien abre la tienda.

---

## 1. Idea general

```
┌────────────┐         ┌────────────┐         ┌─────────────────┐
│  Editor    │  edita  │  Google    │   lee   │  sweethome.com  │
│ (tú)       │ ──────▶ │  Sheet     │ ──────▶ │  (sitio web)    │
└────────────┘         └────────────┘         └─────────────────┘
```

- Tú entras al sheet por Google Sheets normal, editas, guardas
  (Google Sheets auto-guarda).
- El sitio baja los datos del sheet cada vez que alguien lo visita.
- **Los cambios tardan entre 1 y 5 minutos en aparecer** (Google cachea el
  endpoint público). Si quieres verlo ya, haz refresh forzado en el navegador
  (`Ctrl+Shift+R` en Windows/Linux, `Cmd+Shift+R` en Mac).

---

## 2. Estructura del sheet

El sheet tiene **2 pestañas** con nombres exactos (en minúsculas):

1. **`products`** — una fila por producto
2. **`categories`** — una fila por categoría

> **Importante**: los nombres de las pestañas deben ser exactamente `products`
> y `categories`. Si las renombras, el sitio no podrá encontrarlas.

### 2.1. Pestaña `products`

Columnas (en este orden, la primera fila son los headers):

| Columna | Tipo | Obligatorio | Ejemplo | Qué es |
|---|---|---|---|---|
| `id` | texto | Sí | `jarrones-03` | Identificador único. **Nunca lo cambies** en productos existentes (rompe enlaces guardados). Para productos nuevos usa el patrón `<categoria>-<numero>`. |
| `category` | texto | Sí | `jarrones` | Slug de la categoría. Debe coincidir con alguno de la pestaña `categories`. |
| `name` | texto | Sí | `Set de 2 Jarrones Dona Negro y Zapote` | Nombre visible del producto. |
| `description` | texto | Sí | `Set de 2 jarrones de cerámica...` | Descripción que se muestra en el detalle. Puede ser multilínea. |
| `measure` | texto | No | `Grande 23 cm, Pequeña 20 cm` | Dimensiones. Si lo dejas vacío, no se muestra en la UI. |
| `price` | número | Sí | `300` | Precio en quetzales, sin símbolo. Solo el número. |
| `visible` | TRUE/FALSE | No (default TRUE) | `TRUE` | `FALSE` oculta el producto del sitio (útil para borradores o descontinuados). |
| `featured` | TRUE/FALSE | No (default FALSE) | `TRUE` | `TRUE` hace que aparezca en la sección "Destacados" del home. |
| `discount` | texto | No | `-20%` | Texto libre que aparece como badge sobre la foto (`-20%`, `2x1`, `OFERTA`, `NAVIDAD`). Dejar vacío para no mostrar badge. |
| `tags` | texto | No | `jarrón, dona, negro, cerámica` | Palabras clave para búsqueda. Separadas por coma dentro de la celda. |
| `images` | texto | Sí (al menos 1) | `https://.../foto-1.jpeg, https://.../foto-2.jpeg` | URLs de las fotos separadas por coma. La primera es el preview; las demás alimentan el carrusel del detalle. |

**Ejemplo de fila completa:**

| id | category | name | description | measure | price | visible | featured | discount | tags | images |
|---|---|---|---|---|---|---|---|---|---|---|
| jarrones-03 | jarrones | Set de 2 Jarrones Dona Negro y Zapote | Set de 2 jarrones de cerámica en acabado negro y zapote, forma dona, estilo minimalista. | Grande 23 cm, Pequeña 20 cm | 300 | TRUE | FALSE |  | jarrón, dona, negro, zapote, cerámica | https://.../jarrones/jarron-3.jpeg, https://.../jarrones/jarron-3-1.jpeg |

> **Nota sobre listas con coma**: cuando escribas varios tags o URLs en una
> celda separados por coma, Google Sheets los guarda como un solo valor
> (no los divide en columnas). Al exportar a CSV, Sheets automáticamente
> envuelve esa celda en comillas porque contiene comas — el editor no tiene
> que preocuparse de eso, solo escribe `jarrón, dona, negro` y listo.

### 2.2. Pestaña `categories`

| Columna | Tipo | Obligatorio | Ejemplo |
|---|---|---|---|
| `slug` | texto | Sí | `jarrones` |
| `name` | texto | Sí | `Jarrones y Floreros` |
| `icon` | texto | No | `fa-solid fa-wine-bottle` |
| `order` | número | Sí | `1` |

- El `slug` debe ser en minúsculas, sin espacios ni tildes (usa guiones si
  necesitas separar palabras: `tablas-queso`, `temporada-otono`).
- El `icon` es el nombre del icono de Font Awesome en formato
  `fa-solid fa-<nombre>`. Si no sabes cuál usar, déjalo vacío.
- El `order` determina el orden en que aparecen las categorías en el menú
  (1 = primera, 2 = segunda, ...).

---

## 3. Setup inicial (una sola vez)

Si el sheet ya está creado y compartido contigo, salta al **paso 3.4**.

### 3.1. Crear el sheet

1. Entra a <https://sheets.google.com>
2. Clic en **"En blanco"** para crear un nuevo sheet
3. Renómbralo, por ejemplo: `SweetHome Catálogo`

### 3.2. Poblar con los datos actuales

**Opción A — desde el panel admin (navegador)**  
Si tienes acceso al admin (`/admin/catalogo`), abre el menú **Exportar** y elige
**CSV productos**, **CSV categorías** o **Ambos CSV (Sheets)**. Se descargan
archivos al disco con el mismo formato de columnas que la opción B. Los
**productos** reflejan el borrador actual del formulario del admin en ese momento
(si recargas la página, vuelves al catálogo base). Las **categorías** salen del JSON empaquetado
del proyecto (el admin MVP aún no edita categorías en pantalla).

**Opción B — script en el repo**  
Tu programador puede exportar el catálogo en disco (`sweethome.json`) a 2 CSV:

```bash
npm run catalog:export-sheets
```

Eso genera 2 archivos en `tmp/sheets-export/`:
- `sweethome-products.csv`
- `sweethome-categories.csv`

Flujo para poblarlos al sheet:

1. En el sheet, **renombra la primera pestaña a `products`** (doble clic en el
   nombre "Hoja 1" abajo).
2. Clic en A1 de esa pestaña. Abre el archivo `sweethome-products.csv` con
   un editor de texto, selecciona todo (Cmd+A), copia (Cmd+C), vuelve al
   sheet y pega (Cmd+V). Google Sheets detecta las columnas automáticamente.
3. Clic en el **`+`** de abajo para crear una nueva pestaña. Renómbrala a
   `categories`.
4. Pega el contenido de `sweethome-categories.csv` en A1 de esa nueva pestaña.

> **Importante**: los nombres exactos de las pestañas son `products` y
> `categories` (minúsculas, sin espacios).

### 3.3. Compartir el sheet

Para que el sitio pueda leer el sheet, éste debe ser públicamente legible:

1. Clic en **"Compartir"** arriba a la derecha
2. En la sección "Acceso general", cambia a **"Cualquier persona con el enlace"**
3. Asegúrate de que el rol es **"Lector"**
4. Clic en **"Listo"**

En la misma pantalla puedes agregar emails específicos como "Editor" para
las personas que van a poder modificar el sheet. Esos sí necesitan login de
Google.

### 3.4. Darle el ID del sheet a tu programador

El ID está en la URL del sheet. Cuando tengas el sheet abierto, la URL se ve
así:

```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIj_KlMnOpQrStUvWxYz1234567890/edit#gid=0
                                        ─────────────────┬─────────────────
                                                         │
                                                    ESTE ES EL ID
```

Pásale ese ID a tu programador. Él lo pone en el `.env` del proyecto así:

```bash
VITE_CATALOG_SHEETS_ID=1AbCdEfGhIj_KlMnOpQrStUvWxYz1234567890
```

Y hace `npm run deploy` una vez para activar la nueva fuente. A partir de
ese momento tú editas directamente el sheet y los cambios se reflejan en el
sitio sin necesidad de volver a desplegar.

---

## 4. Edición día a día

Ya con el sheet configurado, tu trabajo diario es súper simple:

### 4.1. Cambiar un precio

1. Entra al sheet
2. Pestaña `products`
3. Busca el producto (Cmd+F funciona)
4. Cambia el valor en la columna `price`
5. Google guarda automáticamente
6. Espera 1-5 minutos y refresca el sitio — el precio nuevo aparece

### 4.2. Ocultar un producto temporalmente

Cambia `visible` de `TRUE` a `FALSE`. El producto desaparece del sitio pero la
fila sigue en el sheet (no la borres). Cuando quieras volver a mostrarlo,
pon `TRUE`.

### 4.3. Agregar un producto nuevo

1. Ve al final de la pestaña `products`
2. Agrega una nueva fila completando las columnas (ver §2.1)
3. El `id` debe ser único — usa el patrón `<categoria>-<siguiente-numero>`
4. Para las fotos (`images`), primero sube los archivos JPEG al bucket S3
   (pídele a tu programador que te dé acceso o que las suba por ti) y luego
   pega las URLs separadas por coma en la celda

### 4.4. Cambiar el orden de las categorías

Pestaña `categories`, columna `order`. Pon números en el orden que quieres
que aparezcan.

### 4.5. Poner una oferta / descuento

En el producto que quieras destacar, pon texto libre en la columna
`discount`:

- `-20%`
- `2x1`
- `OFERTA`
- `NAVIDAD`
- `BLACK FRIDAY`

Aparece como un badge sobre la foto del producto. Dejarlo vacío quita el
badge.

### 4.6. Hacer que un producto aparezca en "Destacados"

Pon `TRUE` en la columna `featured` del producto. Los productos destacados
aparecen en una sección especial arriba de todo en el home.

---

## 5. Errores comunes

### 5.1. "Mi cambio no aparece en el sitio"

- **Espera 5 minutos** — Google cachea el endpoint público y refresca cada
  pocos minutos.
- **Refresca forzado el navegador** (`Cmd+Shift+R` en Mac, `Ctrl+Shift+R`
  en Windows) para saltarte el cache del browser.
- **Verifica que guardaste** — Google Sheets guarda automáticamente pero
  a veces el indicador de "Guardando..." tarda. Espera a ver "Todos los
  cambios guardados en Drive".

### 5.2. "El producto no se ve en el sitio aunque visible = TRUE"

- Revisa que `category` coincida **exactamente** con un `slug` de la pestaña
  `categories`. Minúsculas, sin tildes, con guiones (no espacios).
- Revisa que `images` no esté vacío y que las URLs sean válidas (puedes
  pegarlas en una pestaña nueva del browser para verificar).
- Revisa que `price` sea un número (sin `Q`, sin coma, sin espacios).

### 5.3. "Se ven raros los acentos o los símbolos"

Asegúrate de que el sheet esté en codificación UTF-8 (es la default, no
debería haber problema salvo que lo hayas importado de un Excel antiguo).
Si ves `Ã±` en vez de `ñ`, es problema de codificación — contacta a tu
programador.

### 5.4. "Accidentalmente borré una fila"

Cmd+Z (deshacer) dentro de Sheets. Si ya cerraste la pestaña: Archivo →
Historial de versiones → Ver historial de versiones → Restaurar la versión
anterior.

### 5.5. "Los cambios aparecen solo en mi navegador pero otros no los ven"

Puede ser cache del CDN del sitio. Espera 5-10 minutos adicionales. Si
persiste, avisa a tu programador — puede forzar un refresh del cache.

---

## 6. Buenas prácticas

1. **No cambies el `id` de productos existentes.** Si un producto necesita
   un id diferente, crea uno nuevo con el id nuevo y pon `visible: FALSE`
   en el viejo.
2. **Mantén los nombres cortos y claros.** El nombre se corta a 2 líneas en
   las tarjetas del catálogo; nombres muy largos se ven mal.
3. **Descripciones con personalidad.** El catálogo es aspiracional — usa un
   tono cálido y evocativo, no frío o técnico. "Transforma tu espacio con..."
   es mejor que "Artículo de cerámica color negro".
4. **Fotos primero siempre es la mejor.** La primera URL del campo `images`
   es la que se ve en las tarjetas del catálogo. Elige la más atractiva.
5. **Duplica filas para crear variantes.** Si tienes un producto en 3
   colores, crea 3 filas distintas con ids diferentes (`candelero-01`,
   `candelero-02`, `candelero-03`) en vez de meterlo todo en una.
6. **Usa el historial de versiones antes de cambios grandes.** Sheets guarda
   un historial completo — puedes volver a cualquier versión anterior
   (Archivo → Historial de versiones).

---

## 7. Contacto

Si algo se ve raro o no estás segura de cómo hacer un cambio, escribe al
programador antes de improvisar en el sheet. Vale más preguntar que andar
restaurando versiones después.
