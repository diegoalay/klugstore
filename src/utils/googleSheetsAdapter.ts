// ============================================
// Google Sheets → RawCatalog adapter
// ============================================
// Fuente única: el **ID** de un Google Sheet. El adaptador usa el endpoint
// `gviz/tq` de Google para consultar las pestañas por nombre (`products` y
// `categories`), recibir CSV con CORS habilitado y transformarlo al shape
// `RawCatalog` que el resto del sistema ya entiende.
//
// Flujo para el editor:
//   1. Crear un Google Sheet con 2 pestañas: `products` y `categories`.
//   2. Clic en "Compartir" → "Cualquier persona con el enlace" → Lector.
//      (Los editores nominales siguen teniendo permiso de edición por email.)
//   3. Copiar el ID del sheet desde la URL:
//      https://docs.google.com/spreadsheets/d/<ESTE_ES_EL_ID>/edit#gid=0
//   4. Pegar en .env:
//      VITE_CATALOG_SHEETS_ID=1AbCdEfGh...
//   5. Listo. El app lee del sheet en runtime y cae al JSON empaquetado si
//      el sheet no está disponible.
//
// Convenciones de columnas:
//   products:   id, category, name, description, measure, price, visible,
//               sold, featured, discount, tags, images
//   categories: slug, name, icon, order
//
// `sold`: TRUE marca el producto como vendido — visible en el catálogo con
// un badge "Vendido" pero sin acción de compra. Es diferente de `visible`
// (que oculta el producto por completo).
//
// Los campos multi-valor (`tags`, `images`) se separan por `,` dentro de la celda.
// Sheets envuelve automáticamente esas celdas en comillas al exportar a CSV
// porque contienen comas, así que el round-trip de Sheets → CSV → parser es
// transparente para el editor (solo escribe `a, b, c` en la celda).
// Los booleanos (`visible`, `featured`) aceptan TRUE/FALSE, true/false, 1/0, sí/no.
// ============================================

import type { RawCatalog, RawCategory, RawProduct } from 'src/utils/catalogData'
import { normalizeIconName } from 'src/utils/iconName'


// ============================================
// CSV parser (RFC 4180 compliant, sin dependencias)
// ============================================
// Maneja:
//   - Campos con comillas dobles: "algo"
//   - Comillas escapadas: ""
//   - Campos con comas o saltos de línea embebidos
//   - CRLF o LF como separador de línea
// ============================================

function parseCSV(csv: string): Record<string, string>[] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  const len = csv.length

  for (let i = 0; i < len; i++) {
    const ch = csv[i]
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field)
        field = ''
      } else if (ch === '\r') {
        // Ignorar CR; esperamos LF
      } else if (ch === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else {
        field += ch ?? ''
      }
    }
  }
  // Último campo/fila si no termina en newline
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  if (rows.length === 0) return []

  const headers = (rows[0] ?? []).map((h) => h.trim().toLowerCase())
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => {
      const obj: Record<string, string> = {}
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? '').trim()
      })
      return obj
    })
}

// ============================================
// Helpers de coerción de tipos
// ============================================

function parseBoolCell(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null) return defaultValue
  const v = raw.trim().toLowerCase()
  if (v === '') return defaultValue
  if (['true', '1', 'yes', 'sí', 'si', 'x'].includes(v)) return true
  if (['false', '0', 'no', ''].includes(v)) return false
  return defaultValue
}

function parseNumberCell(raw: string | undefined, defaultValue = 0): number {
  if (!raw) return defaultValue
  // Remover cualquier caracter que no sea dígito o punto (Q, $, comas, espacios, etc.)
  const cleaned = raw.replace(/[^\d.]/g, '')
  if (!cleaned) return defaultValue
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : defaultValue
}

function parseMultiValueCell(raw: string | undefined): string[] {
  if (!raw) return []
  // Separador primario: coma. Aceptamos también `|` como fallback por
  // compatibilidad con cualquier celda que un editor haya poblado antes.
  const separator = raw.includes(',') ? ',' : '|'
  return raw
    .split(separator)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// ============================================
// Transformer: filas CSV → RawCatalog
// ============================================

interface SheetsCatalogMeta {
  store: string
  name: string
  currency: string
}

function rowsToRawCatalog(
  productsRows: Record<string, string>[],
  categoriesRows: Record<string, string>[],
  meta: SheetsCatalogMeta,
): RawCatalog {
  const categories: RawCategory[] = categoriesRows
    .map((r) => {
      const slug = (r['slug'] ?? '').trim()
      if (!slug) return null
      const cat: RawCategory = {
        slug,
        name: (r['name'] ?? slug).trim(),
        order: parseNumberCell(r['order'], 999),
      }
      // Acepta nombres cortos (`faucet`) o formato completo
      // (`fa-solid fa-faucet`). Se normaliza al formato completo aquí.
      const icon = normalizeIconName(r['icon'])
      if (icon) cat.icon = icon
      return cat
    })
    .filter((c): c is RawCategory => c !== null)

  const products: RawProduct[] = productsRows
    .map((r) => {
      const id = (r['id'] ?? '').trim()
      if (!id) return null

      const product: RawProduct = {
        id,
        category: (r['category'] ?? '').trim(),
        name: (r['name'] ?? '').trim(),
        description: (r['description'] ?? '').trim(),
        price: parseNumberCell(r['price'], 0),
        images: parseMultiValueCell(r['images']),
        visible: parseBoolCell(r['visible'], true),
      }

      const measure = (r['measure'] ?? '').trim()
      if (measure) product.measure = measure

      const tags = parseMultiValueCell(r['tags'])
      if (tags.length > 0) product.tags = tags

      const discount = (r['discount'] ?? '').trim()
      if (discount) product.discount = discount

      if (parseBoolCell(r['featured'], false)) product.featured = true
      if (parseBoolCell(r['sold'], false)) product.sold = true

      return product
    })
    .filter((p): p is RawProduct => p !== null)

  return {
    store: meta.store,
    name: meta.name,
    currency: meta.currency,
    categories,
    products,
  }
}

// ============================================
// Fetcher público
// ============================================

/**
 * Construye la URL del endpoint `gviz/tq` de Google para una pestaña dada.
 * Requiere que el sheet esté compartido como "Cualquier persona con el
 * enlace" (Lector). El endpoint:
 *  - Tiene CORS habilitado ✅
 *  - Acepta el nombre de la pestaña vía `sheet=`
 *  - Devuelve CSV puro con `tqx=out:csv`
 *  - No necesita "Publicar en la web"
 */
function buildGvizCsvUrl(sheetId: string, tabName: string): string {
  const params = new URLSearchParams({
    tqx: 'out:csv',
    sheet: tabName,
    t: String(Date.now()), // cache-busting
  })
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?${params.toString()}`
}

/**
 * Intenta bajar el catálogo desde un Google Sheet (2 pestañas: `products` y
 * `categories`) usando su ID. Devuelve `null` si no está configurado, si el
 * fetch/parse falla, o si el sheet no tiene las pestañas esperadas.
 * Los errores se loguean como warnings pero no se propagan — el caller cae
 * automáticamente a la siguiente fuente (JSON remoto o bundled).
 */
export async function fetchCatalogFromSheets(): Promise<RawCatalog | null> {
  const sheetId = import.meta.env.VITE_CATALOG_SHEETS_ID?.trim()
  if (!sheetId) {
    console.warn('[sheets] VITE_CATALOG_SHEETS_ID no está definido en .env')
    return null
  }
  console.info('[sheets] Cargando catálogo desde Google Sheets:', sheetId)

  try {
    const productsUrl = buildGvizCsvUrl(sheetId, 'products')
    const categoriesUrl = buildGvizCsvUrl(sheetId, 'categories')

    const [pRes, cRes] = await Promise.all([
      fetch(productsUrl, { cache: 'no-cache' }),
      fetch(categoriesUrl, { cache: 'no-cache' }),
    ])

    if (!pRes.ok || !cRes.ok) {
      console.warn(
        `[sheets] fetch falló — products: ${pRes.status}, categories: ${cRes.status} — ¿sheet compartido públicamente?`,
      )
      return null
    }

    const [pCsv, cCsv] = await Promise.all([pRes.text(), cRes.text()])

    // gviz devuelve HTML de error si las pestañas no existen o si el sheet
    // no es público. Detectamos eso mirando el prefijo de la respuesta.
    if (pCsv.trimStart().startsWith('<') || cCsv.trimStart().startsWith('<')) {
      console.warn(
        '[sheets] respuesta es HTML, no CSV — verificar que el sheet esté compartido como "Cualquiera con el enlace: Lector" y que tenga pestañas llamadas `products` y `categories`',
      )
      return null
    }

    const productsRows = parseCSV(pCsv)
    const categoriesRows = parseCSV(cCsv)

    if (productsRows.length === 0) {
      console.warn('[sheets] pestaña `products` vacía o sin headers')
      return null
    }
    if (categoriesRows.length === 0) {
      console.warn('[sheets] pestaña `categories` vacía o sin headers')
      return null
    }

    const rawCatalog = rowsToRawCatalog(productsRows, categoriesRows, {
      store: 'sweethome',
      name: 'SweetHome GT',
      currency: 'GTQ',
    })

    if (rawCatalog.categories.length === 0 || rawCatalog.products.length === 0) {
      console.warn('[sheets] parseado pero vacío — revisar columnas / headers del sheet')
      return null
    }

    return rawCatalog
  } catch (err) {
    console.warn('[sheets] excepción al bajar catálogo:', err)
    return null
  }
}

/** No-op — mantenido por compatibilidad de API. */
export function clearSheetsCache(): void {
  // Sin cache en memoria; cada llamada hace fetch fresco.
}
