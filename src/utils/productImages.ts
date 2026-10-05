import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/boot/firebase'
import type { ProductImage } from '@/types'

const OWN_STORAGE = 'firebasestorage.googleapis.com'

/**
 * Copia a Storage las imágenes que todavía apuntan afuera (p. ej. el CDN de
 * Instagram, cuyos links caducan en días) y devuelve la lista con URLs propias.
 * Las que ya están en Storage no se tocan.
 */
export async function persistExternalImages(
  images: ProductImage[],
  storeSlug: string,
  productId: string,
): Promise<ProductImage[]> {
  return Promise.all(
    images.map(async (img, i) => {
      if (img.url.includes(OWN_STORAGE)) return { ...img, order: i }
      const res = await fetch(img.url)
      if (!res.ok) throw new Error(`No se pudo descargar la foto ${i + 1} (HTTP ${res.status})`)
      const ref = storageRef(storage, `stores/${storeSlug}/products/${productId}/imported-${Date.now()}-${i}.jpg`)
      await uploadBytes(ref, await res.blob(), { contentType: res.headers.get('content-type') ?? 'image/jpeg' })
      return { ...img, url: await getDownloadURL(ref), order: i }
    }),
  )
}

/** Siguiente ID con el esquema de la base: `{categoría}-{nn}` (p. ej. `trays-28`). */
export function nextProductId(categorySlug: string, existingIds: string[]): string {
  const prefix = `${categorySlug}-`
  const max = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter(Number.isFinite)
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}${String(max + 1).padStart(2, '0')}`
}
