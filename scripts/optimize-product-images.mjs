/**
 * Backfill de las fotos de producto que ya existían en Storage (stores/{store}/products/**).
 * Las fotos nuevas se optimizan solas con la Cloud Function optimizeProductImage; este script
 * hace lo mismo con las anteriores, usando el mismo módulo (functions/imageVariants.js):
 *
 *  1. Genera variantes WebP 480/720/1080 junto a cada foto:
 *       …/products/{id}/variants/{nombre}_{ancho}.webp
 *     Una variante se regenera si la original cambió (`sourceGeneration` en su metadata).
 *  2. Pone Cache-Control a originales y variantes. Hoy Storage las sirve con
 *     "private, max-age=0": el navegador vuelve a pedir cada foto en cada visita.
 *
 *   npm run images:optimize                          # dry run: solo muestra lo que haría
 *   npm run images:optimize -- --apply               # escribe en Storage
 *   npm run images:optimize -- --apply --only=candle-holders-14
 *
 * Requiere ./serviceAccountKey.json y las dependencias de functions/ instaladas
 * (`npm --prefix functions install`, de ahí sale sharp).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import {
  IMAGE_CACHE_CONTROL,
  VARIANT_WIDTHS,
  isOptimizableProductImage,
  renderVariant,
  variantMetadata,
  variantPath,
} from '../functions/imageVariants.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const STORE = 'sweethome'
const BUCKET = 'sweet-home-gt.firebasestorage.app'
const apply = process.argv.includes('--apply')
const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length)

initializeApp({
  credential: cert(JSON.parse(readFileSync(join(root, 'serviceAccountKey.json'), 'utf8'))),
  storageBucket: BUCKET,
})
const bucket = getStorage().bucket()

const kb = (n) => `${Math.round(Number(n) / 1024)} KB`

const [files] = await bucket.getFiles({ prefix: `stores/${STORE}/products/${only ? `${only}/` : ''}` })
const byName = new Map(files.map((f) => [f.name, f]))
const originals = files.filter((f) => isOptimizableProductImage(f.name, f.metadata.contentType))

let totalOriginal = 0
let totalVariants = 0
let toCreate = 0
let toCache = 0

for (const file of originals) {
  const { size, generation, cacheControl } = file.metadata
  totalOriginal += Number(size)
  const pending = VARIANT_WIDTHS.filter((w) => {
    const existing = byName.get(variantPath(file.name, w))
    return existing?.metadata.metadata?.sourceGeneration !== String(generation)
  })
  const needsCache = cacheControl !== IMAGE_CACHE_CONTROL
  if (!pending.length && !needsCache) continue

  console.log(
    `${file.name.replace(`stores/${STORE}/products/`, '')}  ${kb(size)}  cache="${cacheControl ?? '(default: private, max-age=0)'}"` +
      (pending.length ? `  → variantes ${pending.join(', ')}` : ''),
  )
  toCreate += pending.length
  if (needsCache) toCache++
  if (!apply) continue

  if (pending.length) {
    const [buffer] = await file.download()
    for (const width of pending) {
      const out = await renderVariant(buffer, width)
      totalVariants += out.length
      await bucket
        .file(variantPath(file.name, width))
        .save(out, { resumable: false, metadata: variantMetadata(generation) })
      console.log(`    + ${width}px ${kb(out.length)}`)
    }
  }
  if (needsCache) await file.setMetadata({ cacheControl: IMAGE_CACHE_CONTROL })
}

console.log(
  `\n${originals.length} fotos originales (${kb(totalOriginal)} en total).` +
    `\n${toCreate} variante(s) por generar, ${toCache} foto(s) sin Cache-Control.` +
    (apply ? `\nVariantes nuevas: ${kb(totalVariants)}.` : '\nDry run: corre con --apply para escribir.'),
)
