#!/usr/bin/env node
// ============================================
// Exporta data/products/{slug}.json → 2 archivos CSV listos para pegar
// en las pestañas `products` y `categories` de un Google Sheet.
//
// Uso:
//   node scripts/export-catalog-to-csv.mjs                 # default: sweethome
//   node scripts/export-catalog-to-csv.mjs otra-tienda     # slug específico
//
// Output:
//   tmp/sheets-export/{slug}-products.csv
//   tmp/sheets-export/{slug}-categories.csv
//
// Luego abres los archivos, seleccionas todo (⌘A), copias (⌘C), vas al
// Google Sheet, te paras en A1 de la pestaña correspondiente y pegas (⌘V).
// Google Sheets detecta automáticamente las columnas.
// ============================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const slug = process.argv[2] ?? 'sweethome'
const jsonPath = resolve(projectRoot, `data/products/${slug}.json`)
const outDir = resolve(projectRoot, 'tmp/sheets-export')

if (!existsSync(jsonPath)) {
  console.error(`❌ No existe: ${jsonPath}`)
  process.exit(1)
}

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCSV(headers, rows) {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','))
  }
  return lines.join('\n') + '\n'
}

const data = JSON.parse(readFileSync(jsonPath, 'utf8'))

// ============================================
// categories.csv
// ============================================
const categoriesCsv = toCSV(
  ['slug', 'name', 'icon', 'order'],
  (data.categories ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    icon: c.icon ?? '',
    order: c.order ?? 0,
  })),
)

// ============================================
// products.csv
// ============================================
const productsCsv = toCSV(
  [
    'id',
    'category',
    'name',
    'description',
    'measure',
    'price',
    'visible',
    'sold',
    'featured',
    'discount',
    'tags',
    'images',
  ],
  (data.products ?? []).map((p) => ({
    id: p.id,
    category: p.category,
    name: p.name,
    description: p.description ?? '',
    measure: p.measure ?? '',
    price: p.price ?? 0,
    visible: p.visible === false ? 'FALSE' : 'TRUE',
    sold: p.sold === true ? 'TRUE' : 'FALSE',
    featured: p.featured === true ? 'TRUE' : 'FALSE',
    discount: p.discount ?? '',
    // `tags` e `images` se serializan como lista separada por coma. Al
    // contener comas, el csvEscape() las envuelve en comillas dobles para que
    // sigan siendo un único campo CSV. Cuando el editor abre el sheet, ve
    // `jarrón, dona, negro` en la celda (Sheets no muestra las comillas).
    tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
    images: Array.isArray(p.images) ? p.images.join(', ') : '',
  })),
)

mkdirSync(outDir, { recursive: true })
const productsPath = resolve(outDir, `${slug}-products.csv`)
const categoriesPath = resolve(outDir, `${slug}-categories.csv`)
writeFileSync(productsPath, productsCsv, 'utf8')
writeFileSync(categoriesPath, categoriesCsv, 'utf8')

console.log('✅ Exportación completa')
console.log('')
console.log(`  ${productsPath}`)
console.log(`    └─ ${data.products?.length ?? 0} productos`)
console.log('')
console.log(`  ${categoriesPath}`)
console.log(`    └─ ${data.categories?.length ?? 0} categorías`)
console.log('')
console.log('Siguiente paso:')
console.log('  1. Abre el sheet destino en Google Sheets')
console.log('  2. Pestaña "categories" — pega categories.csv (Cmd+A → Cmd+C → Cmd+V)')
console.log('  3. Pestaña "products"   — pega products.csv')
console.log('  4. Publica en la web (Archivo → Compartir → Publicar en la web → CSV)')
console.log('  5. Copia las 2 URLs publicadas a .env')
console.log('  6. Reinicia `npm run dev` o redespliega')
