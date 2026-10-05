/**
 * Genera public/sitemap.xml desde la fuente real del catálogo: Firestore
 * (stores/{slug}) con el Google Sheet como respaldo si la tienda no está
 * migrada todavía. Antes leía `data/products/{slug}.json`, que ya no existe
 * en el repo (se borró en 909c4e3, abr 2026) — este script estaba roto desde
 * entonces.
 *
 * STORE_SLUG default: sweethome. Base URL: SITEMAP_BASE_URL → https://sweethome.gt
 * slugify = src/utils/slugify.ts (slugifyCatalogText).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const storeSlug = process.env.STORE_SLUG || 'sweethome'
const outPath = join(root, 'public/sitemap.xml')

function slugifyCatalogText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function readEnvVar(name) {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return undefined
  const content = readFileSync(envPath, 'utf8')
  const line = content.split('\n').find((l) => l.trim().startsWith(`${name}=`))
  if (!line) return undefined
  return line
    .slice(line.indexOf('=') + 1)
    .trim()
    .replace(/^["']|["']$/g, '')
}

// ============================================
// Fuente 1: Firestore (pública, sin credenciales — las reglas permiten
// lectura de `stores/**` a cualquiera)
// ============================================

async function fetchFromFirestore() {
  const firebaseConfig = {
    apiKey: readEnvVar('VITE_FIREBASE_API_KEY'),
    authDomain: readEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnvVar('VITE_FIREBASE_PROJECT_ID'),
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null

  const app = initializeApp(firebaseConfig, 'sitemap-gen')
  const db = getFirestore(app)

  const storeSnap = await getDoc(doc(db, 'stores', storeSlug))
  if (!storeSnap.exists()) return null

  const storeData = storeSnap.data()
  const [catSnap, prodSnap] = await Promise.all([
    getDocs(collection(db, 'stores', storeSlug, 'categories')),
    getDocs(collection(db, 'stores', storeSlug, 'products')),
  ])

  return {
    publicUrl: storeData.publicUrl,
    categories: catSnap.docs.map((d) => ({ slug: d.id })),
    products: prodSnap.docs.map((d) => {
      const p = d.data()
      return { id: d.id, name: p.name, visible: p.visible }
    }),
  }
}

// ============================================
// Fuente 2: Google Sheet en vivo (respaldo si la tienda no está migrada)
// ============================================

function parseCSV(csv) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') {
        row.push(field)
        field = ''
      } else if (ch === '\r') {
        // ignorar
      } else if (ch === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else field += ch ?? ''
    }
  }
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
      const obj = {}
      headers.forEach((h, idx) => (obj[h] = (r[idx] ?? '').trim()))
      return obj
    })
}

async function fetchFromSheet() {
  const sheetId = readEnvVar('VITE_CATALOG_SHEETS_ID')
  if (!sheetId) return null

  async function fetchTab(tab) {
    const params = new URLSearchParams({ tqx: 'out:csv', sheet: tab, t: String(Date.now()) })
    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?${params}`,
    )
    if (!res.ok) return []
    const text = await res.text()
    if (text.trimStart().startsWith('<')) return []
    return parseCSV(text)
  }

  const [productRows, categoryRows] = await Promise.all([fetchTab('products'), fetchTab('categories')])
  if (productRows.length === 0) return null

  return {
    publicUrl: undefined,
    categories: categoryRows.map((r) => ({ slug: r['slug'] })).filter((c) => c.slug),
    products: productRows
      .map((r) => ({ id: r['id'], name: r['name'], visible: r['visible'] !== 'FALSE' }))
      .filter((p) => p.id),
  }
}

// ============================================
// Main
// ============================================

async function main() {
  let data = null
  try {
    data = await fetchFromFirestore()
  } catch (err) {
    console.warn('[sitemap] Firestore no disponible, probando Sheet:', err.message)
  }
  if (!data) data = await fetchFromSheet()

  if (!data) {
    console.error(
      '✗ No se pudo obtener el catálogo (ni Firestore ni Sheet). Revisa VITE_FIREBASE_* / VITE_CATALOG_SHEETS_ID en .env.',
    )
    process.exit(1)
  }

  const BASE = (data.publicUrl || process.env.SITEMAP_BASE_URL || 'https://sweethome.gt').replace(/\/$/, '')
  const lastmod = new Date().toISOString().slice(0, 10)

  const urls = []
  urls.push({ loc: `${BASE}/`, changefreq: 'weekly', priority: '1.0' })
  urls.push({ loc: `${BASE}/catalog`, changefreq: 'weekly', priority: '0.9' })
  urls.push({ loc: `${BASE}/about`, changefreq: 'monthly', priority: '0.7' })
  urls.push({ loc: `${BASE}/preguntas-frecuentes`, changefreq: 'monthly', priority: '0.6' })
  urls.push({ loc: `${BASE}/privacidad`, changefreq: 'yearly', priority: '0.2' })

  for (const c of data.categories) {
    urls.push({ loc: `${BASE}/catalog/categoria/${c.slug}`, changefreq: 'weekly', priority: '0.8' })
  }

  for (const p of data.products) {
    if (p.visible === false) continue
    const slug = `${slugifyCatalogText(p.name)}-${p.id}`
    urls.push({ loc: `${BASE}/catalog/producto/${slug}`, changefreq: 'weekly', priority: '0.65' })
  }

  const body = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
  writeFileSync(outPath, xml, 'utf8')
  console.log(`✔ sitemap.xml generado: ${urls.length} URLs (${data.products.length} productos).`)
}

main().catch((err) => {
  console.error('✗ Falló la generación del sitemap:', err)
  process.exit(1)
})
