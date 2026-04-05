/**
 * Aplica un export del /admin sobre data/products/{STORE_SLUG}.json
 *
 * Uso:
 *   STORE_SLUG=mi-tienda node scripts/apply-admin-overlay-to-json.mjs [overlay.json]
 *   node scripts/apply-admin-overlay-to-json.mjs --store=mi-tienda ./export.json
 *
 * Si no pasas archivo, usa ./{STORE_SLUG}-admin-overlay.json en la raíz del proyecto.
 *
 * El JSON puede incluir (opcional):
 *   - removedIds: string[] — quita esas filas del array products
 *   - addedProducts: Record<id, { category, name, description, price, images, ... }>
 *     — inserta productos nuevos antes de aplicar parches
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const args = process.argv.slice(2)
let storeSlug = process.env.STORE_SLUG || 'sweethome'
const storeArg = args.find((a) => a.startsWith('--store='))
if (storeArg) {
  storeSlug = storeArg.slice('--store='.length).trim()
}
const fileArgs = args.filter((a) => !a.startsWith('--store='))

const CATALOG_PATH = join(root, 'data/products', `${storeSlug}.json`)
const overlayPath = fileArgs[0]
  ? resolve(fileArgs[0])
  : join(root, `${storeSlug}-admin-overlay.json`)

let overlayRaw
try {
  overlayRaw = readFileSync(overlayPath, 'utf8')
} catch (e) {
  console.error(`No se pudo leer el overlay: ${overlayPath}`)
  console.error(
    'Exporta desde /admin o pasa la ruta del JSON. Por defecto se busca el archivo en la raíz del proyecto.',
  )
  process.exit(1)
}

const overlay = JSON.parse(overlayRaw)
if (overlay?.v !== 1 || typeof overlay.products !== 'object') {
  console.error('JSON inválido: se espera { "v": 1, "products": { ... } }')
  process.exit(1)
}

const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'))

if (Array.isArray(overlay.removedIds) && overlay.removedIds.length) {
  const rm = new Set(overlay.removedIds)
  const before = catalog.products.length
  catalog.products = catalog.products.filter((p) => !rm.has(p.id))
  console.log(`Eliminados: ${before - catalog.products.length} producto(s) (removedIds)`)
}

if (overlay.addedProducts && typeof overlay.addedProducts === 'object') {
  const existing = new Set(catalog.products.map((p) => p.id))
  let added = 0
  for (const [id, body] of Object.entries(overlay.addedProducts)) {
    if (existing.has(id)) {
      console.warn(`addedProducts: id "${id}" ya existe, se omite el alta`)
      continue
    }
    const row = {
      id,
      category: body.category,
      name: body.name,
      description: body.description ?? '',
      price: body.price ?? 0,
      visible: body.visible !== false,
      images: Array.isArray(body.images) ? body.images : [],
    }
    if (body.measure) row.measure = body.measure
    if (body.featured === true) row.featured = true
    if (body.sold === true) row.sold = true
    if (body.discount != null && body.discount !== '') row.discount = body.discount
    if (Array.isArray(body.tags) && body.tags.length) row.tags = body.tags
    catalog.products.push(row)
    existing.add(id)
    added++
  }
  if (added) console.log(`Añadidos: ${added} producto(s) (addedProducts)`)
}

const byId = new Map(catalog.products.map((p) => [p.id, p]))

let applied = 0
const missing = []

for (const [id, patch] of Object.entries(overlay.products)) {
  const raw = byId.get(id)
  if (!raw) {
    missing.push(id)
    continue
  }
  if (patch.name !== undefined) raw.name = patch.name
  if (patch.description !== undefined) raw.description = patch.description
  if (patch.price !== undefined) raw.price = patch.price
  if (patch.visible !== undefined) raw.visible = patch.visible
  if (patch.sold !== undefined) {
    if (patch.sold) raw.sold = true
    else delete raw.sold
  }
  if (patch.measure !== undefined) {
    if (patch.measure) raw.measure = patch.measure
    else delete raw.measure
  }
  if (patch.discount !== undefined) raw.discount = patch.discount
  if (patch.tags !== undefined) raw.tags = patch.tags
  if (patch.images !== undefined) raw.images = patch.images
  applied++
}

const out = `${JSON.stringify(catalog, null, 2)}\n`
writeFileSync(CATALOG_PATH, out, 'utf8')

console.log(`OK [${storeSlug}]: ${applied} parche(s) de producto(s) → ${CATALOG_PATH}`)
if (missing.length) {
  console.warn(`IDs en products{} que no existen en el JSON (omitidos): ${missing.join(', ')}`)
}
console.log('Siguiente: STORE_SLUG=' + storeSlug + ' npm run generate:sitemap (o npm run build).')
