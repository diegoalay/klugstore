/**
 * Migra el catálogo actual (fuente: Google Sheet en vivo, VITE_CATALOG_SHEETS_ID)
 * a Firestore, con el mismo schema que lee `src/utils/firestoreAdapter.ts`:
 *
 *   stores/{slug}                       → metadata de tienda
 *   stores/{slug}/categories/{catSlug}  → una por categoría
 *   stores/{slug}/products/{productId}  → una por producto, images como
 *                                          {url, alt, order}[]
 *
 * También **re-sube cada foto** del CDN viejo (S3) al bucket de Firebase
 * Storage (misma ruta que usa el admin: `stores/{slug}/products/{id}/...`),
 * para dejar de depender del CDN externo. Puede tardar varios minutos si hay
 * muchos productos/fotos (las sube una por una, con progreso en consola).
 * Usa `--skip-images` para migrar solo los datos y dejar las URLs del CDN
 * viejo tal cual (más rápido, útil para probar el resto de la migración).
 *
 * Requiere credenciales de Firebase Admin. Antes de correrlo:
 *   1. Firebase Console → Configuración del proyecto → Cuentas de servicio
 *      → "Generar nueva clave privada" → guardar el JSON descargado como
 *      `./serviceAccountKey.json` en la raíz del repo (ya está en .gitignore).
 *   2. node scripts/migrate-to-firestore.mjs [storeSlug] [--skip-images]
 *      (storeSlug default: sweethome)
 *
 * Es idempotente (usa `set`, no `add`) — se puede correr varias veces sin
 * duplicar nada; cada corrida sobreescribe con el estado actual del Sheet
 * (y vuelve a re-subir las imágenes, generando copias nuevas en Storage —
 * no borra las anteriores).
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const positionalArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const storeSlug = positionalArgs[0] || 'sweethome'

// ============================================
// Config / credenciales
// ============================================

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

const sheetId = readEnvVar('VITE_CATALOG_SHEETS_ID')
if (!sheetId) {
  console.error('✗ VITE_CATALOG_SHEETS_ID no está definido en .env')
  process.exit(1)
}

const serviceAccountPath = join(root, 'serviceAccountKey.json')
if (!existsSync(serviceAccountPath)) {
  console.error(
    '✗ No se encontró serviceAccountKey.json en la raíz del repo.\n' +
      '  Firebase Console → Configuración del proyecto → Cuentas de servicio\n' +
      '  → "Generar nueva clave privada" → guardar como serviceAccountKey.json aquí.',
  )
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
const storageBucket = readEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || `${serviceAccount.project_id}.firebasestorage.app`

initializeApp({ credential: cert(serviceAccount), storageBucket })
const db = getFirestore()
const bucket = getStorage().bucket()

const skipImages = process.argv.includes('--skip-images')

// ============================================
// CSV parser (idéntico a src/utils/googleSheetsAdapter.ts, portado a Node)
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
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
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
      } else {
        field += ch ?? ''
      }
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
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? '').trim()
      })
      return obj
    })
}

function parseBoolCell(raw, defaultValue) {
  if (raw == null) return defaultValue
  const v = raw.trim().toLowerCase()
  if (v === '') return defaultValue
  if (['true', '1', 'yes', 'sí', 'si', 'x'].includes(v)) return true
  if (['false', '0', 'no'].includes(v)) return false
  return defaultValue
}

function parseNumberCell(raw, defaultValue = 0) {
  if (!raw) return defaultValue
  const cleaned = raw.replace(/[^\d.]/g, '')
  if (!cleaned) return defaultValue
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : defaultValue
}

function parseMultiValueCell(raw) {
  if (!raw) return []
  const separator = raw.includes(',') ? ',' : '|'
  return raw
    .split(separator)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function buildGvizCsvUrl(tabName) {
  const params = new URLSearchParams({ tqx: 'out:csv', sheet: tabName, t: String(Date.now()) })
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?${params.toString()}`
}

async function fetchTabCsv(tabName) {
  const res = await fetch(buildGvizCsvUrl(tabName))
  if (!res.ok) throw new Error(`fetch ${tabName} → HTTP ${res.status}`)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) {
    throw new Error(
      `${tabName}: respuesta es HTML, no CSV — ¿el Sheet está compartido como "Cualquiera con el enlace: Lector"?`,
    )
  }
  return text
}

// ============================================
// Re-subida de imágenes (CDN viejo → Firebase Storage)
// ============================================

function guessExtension(url, contentType) {
  const fromUrl = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.exec(url)?.[1]?.toLowerCase()
  if (fromUrl) return fromUrl === 'jpeg' ? 'jpg' : fromUrl
  if (contentType?.includes('png')) return 'png'
  if (contentType?.includes('webp')) return 'webp'
  if (contentType?.includes('gif')) return 'gif'
  return 'jpg'
}

/**
 * Descarga una imagen del CDN viejo (S3) y la resube al bucket de Firebase
 * Storage, bajo la misma convención de rutas que usa el admin
 * (`stores/{slug}/products/{productId}/...`). Devuelve la URL pública nueva.
 * Si falla la descarga/subida, devuelve la URL original (no bloquea la
 * migración por una imagen rota).
 */
async function reuploadImage(originalUrl, productId, index) {
  try {
    const res = await fetch(originalUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') || ''
    // Links privados (Google Drive) responden 200 con una página de login: no es una foto.
    if (!contentType.startsWith('image/')) throw new Error(`no es una imagen (${contentType || 'sin tipo'})`)
    const buffer = Buffer.from(await res.arrayBuffer())
    const ext = guessExtension(originalUrl, contentType)
    const path = `stores/${storeSlug}/products/${productId}/migrated-${index}.${ext}`
    const file = bucket.file(path)
    await file.save(buffer, { metadata: { contentType }, resumable: false })
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media`
  } catch (err) {
    console.warn(`  ⚠ no se pudo re-subir imagen de ${productId} (#${index}): ${err.message} — se deja la URL original`)
    return originalUrl
  }
}

// ============================================
// Migración
// ============================================

async function main() {
  // Firestore ya es la fuente de verdad (IDs normalizados en inglés); el Sheet
  // quedó obsoleto. Re-correr esto duplicaría productos con los IDs viejos.
  const existing = await db.collection('stores').doc(storeSlug).collection('products').limit(1).get()
  if (!existing.empty && !process.argv.includes('--force')) {
    console.error(`✗ stores/${storeSlug} ya tiene productos. Firestore es la fuente de verdad; usa --force solo si sabes lo que haces.`)
    process.exit(1)
  }

  console.log(`→ Bajando Sheet (${sheetId})…`)
  const [productsCsv, categoriesCsv] = await Promise.all([
    fetchTabCsv('products'),
    fetchTabCsv('categories'),
  ])

  const productRows = parseCSV(productsCsv)
  const categoryRows = parseCSV(categoriesCsv)
  console.log(`  ${categoryRows.length} categorías, ${productRows.length} productos en el Sheet.`)

  const batch = db.batch()

  const storeRef = db.collection('stores').doc(storeSlug)
  batch.set(
    storeRef,
    {
      name: 'SweetHome GT',
      currency: 'GTQ',
      publicUrl: 'https://sweethome.gt',
      whatsappNumber: '50239742544',
      migratedAt: new Date().toISOString(),
      migratedFrom: 'google-sheets',
    },
    { merge: true },
  )

  let catCount = 0
  for (const r of categoryRows) {
    const slug = (r['slug'] ?? '').trim()
    if (!slug) continue
    const ref = storeRef.collection('categories').doc(slug)
    const data = { name: (r['name'] ?? slug).trim(), order: parseNumberCell(r['order'], 999) }
    const icon = (r['icon'] ?? '').trim()
    if (icon) data.icon = icon
    batch.set(ref, data)
    catCount++
  }

  let prodCount = 0
  let imgCount = 0
  for (const r of productRows) {
    const id = (r['id'] ?? '').trim()
    if (!id) continue
    const name = (r['name'] ?? '').trim()
    const imageUrls = parseMultiValueCell(r['images'])

    let images
    if (skipImages) {
      images = imageUrls.map((url, i) => ({ url, alt: name, order: i }))
    } else {
      images = []
      for (let i = 0; i < imageUrls.length; i++) {
        process.stdout.write(`  Subiendo imagen ${i + 1}/${imageUrls.length} de "${name}"…\r`)
        const url = await reuploadImage(imageUrls[i], id, i)
        images.push({ url, alt: name, order: i })
        imgCount++
      }
    }

    const data = {
      category: (r['category'] ?? '').trim(),
      name,
      description: (r['description'] ?? '').trim(),
      price: parseNumberCell(r['price'], 0),
      images,
      visible: parseBoolCell(r['visible'], true),
    }
    const measure = (r['measure'] ?? '').trim()
    if (measure) data.measure = measure
    const tags = parseMultiValueCell(r['tags'])
    if (tags.length > 0) data.tags = tags
    const discount = (r['discount'] ?? '').trim()
    if (discount) data.discount = discount
    if (parseBoolCell(r['featured'], false)) data.featured = true
    if (parseBoolCell(r['sold'], false)) data.sold = true

    const ref = storeRef.collection('products').doc(id)
    batch.set(ref, data)
    prodCount++
  }

  await batch.commit()
  console.log('') // limpia la línea de progreso
  console.log(
    `✔ Migrado a stores/${storeSlug}: ${catCount} categorías, ${prodCount} productos` +
      (skipImages ? ' (imágenes dejadas en el CDN viejo, --skip-images).' : `, ${imgCount} imágenes re-subidas a Storage.`),
  )
}

main().catch((err) => {
  console.error('✗ Migración falló:', err)
  process.exit(1)
})
