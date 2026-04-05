/**
 * Genera public/sitemap.xml desde data/products/{STORE_SLUG}.json.
 * STORE_SLUG default: sweethome. Base URL: json.publicUrl → SITEMAP_BASE_URL → https://sweethome.com.gt
 * slugify = src/utils/slugify.ts (slugifyCatalogText).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const storeSlug = process.env.STORE_SLUG || 'sweethome'
const jsonPath = join(root, 'data/products', `${storeSlug}.json`)
const outPath = join(root, 'public/sitemap.xml')

function slugifyCatalogText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

const raw = JSON.parse(readFileSync(jsonPath, 'utf8'))
const BASE = (raw.publicUrl || process.env.SITEMAP_BASE_URL || 'https://sweethome.com.gt').replace(
  /\/$/,
  '',
)
const lastmod = new Date().toISOString().slice(0, 10)

/** @type {{ loc: string; changefreq: string; priority: string }[]} */
const urls = []

urls.push({ loc: `${BASE}/`, changefreq: 'weekly', priority: '1.0' })
urls.push({ loc: `${BASE}/catalog`, changefreq: 'weekly', priority: '0.9' })
urls.push({ loc: `${BASE}/about`, changefreq: 'monthly', priority: '0.7' })

for (const c of raw.categories) {
  urls.push({
    loc: `${BASE}/catalog/categoria/${c.slug}`,
    changefreq: 'weekly',
    priority: '0.8',
  })
}

for (const p of raw.products) {
  if (p.visible === false) continue
  const slug = `${slugifyCatalogText(p.name)}-${p.id}`
  urls.push({
    loc: `${BASE}/catalog/producto/${slug}`,
    changefreq: 'weekly',
    priority: '0.65',
  })
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
console.log(`sitemap [${storeSlug}]: ${urls.length} URLs → ${outPath} (base ${BASE})`)
