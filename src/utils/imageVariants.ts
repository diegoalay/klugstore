/**
 * Variantes livianas de las fotos de producto.
 *
 * Las fotos originales en Storage llegan a 3000×4000 px y ~1 MB (salen así de Instagram o
 * del celular). `npm run images:optimize -- --apply` genera al lado de cada una versiones WebP por
 * ancho (480/720/1080): `…/products/{id}/variants/{nombre}_{ancho}.webp`. La URL de la variante se deduce
 * de la original, así que no hay que tocar los datos de Firestore.
 *
 * Mientras VITE_IMAGE_VARIANTS no sea "1" todo usa la original (activar solo después de
 * correr el script). Si una variante no existe (foto subida después del script), la imagen
 * cae a la original con `onImageVariantError`.
 */
// Mantener en sincronía con VARIANT_WIDTHS de functions/imageVariants.js (Cloud Function y
// script de backfill): si el front pide un ancho que no se generó, cae a la original.
export const IMAGE_VARIANT_WIDTHS = [480, 720, 1080] as const
export type ImageVariantWidth = (typeof IMAGE_VARIANT_WIDTHS)[number]

/** Tarjetas del catálogo (~50vw en celular, ~300px en escritorio): nunca la de 1080. */
export const CARD_WIDTHS: readonly ImageVariantWidth[] = [480, 720]
/** Foto principal de la ficha. */
export const DETAIL_WIDTHS: readonly ImageVariantWidth[] = [720, 1080]

const STORAGE_URL = /^(https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/)([^?]+)(?:\?.*)?$/

export function imageVariantsEnabled(): boolean {
  return String(import.meta.env.VITE_IMAGE_VARIANTS ?? '') === '1'
}

/** Ruta de Storage de la variante (la misma convención que usa el script). */
export function variantStoragePath(originalPath: string, width: number): string {
  const slash = originalPath.lastIndexOf('/')
  const dir = originalPath.slice(0, slash)
  const base = originalPath.slice(slash + 1).replace(/\.[^.]+$/, '')
  return `${dir}/variants/${base}_${width}.webp`
}

/** URL pública de la variante, o null si la foto no es de nuestro Storage. */
export function imageVariantUrl(url: string, width: number, enabled = imageVariantsEnabled()): string | null {
  if (!enabled) return null
  const m = STORAGE_URL.exec(url)
  if (!m?.[1] || !m[2]) return null
  const path = decodeURIComponent(m[2])
  if (path.includes('/variants/')) return null
  return `${m[1]}${encodeURIComponent(variantStoragePath(path, width))}?alt=media`
}

/** `src` para un ancho dado: la variante si aplica, si no la original. */
export function imageSrc(url: string, width: ImageVariantWidth, enabled = imageVariantsEnabled()): string {
  return imageVariantUrl(url, width, enabled) ?? url
}

/** `srcset` con las variantes pedidas, o undefined si no aplican (el navegador usa `src`). */
export function imageSrcset(
  url: string,
  widths: readonly ImageVariantWidth[] = IMAGE_VARIANT_WIDTHS,
  enabled = imageVariantsEnabled(),
): string | undefined {
  const entries = widths.map((w) => {
    const v = imageVariantUrl(url, w, enabled)
    return v ? `${v} ${w}w` : null
  })
  return entries.every(Boolean) ? entries.join(', ') : undefined
}

/**
 * Handler de `@error` para un <img> que usa variantes: si la variante falla, vuelve a la
 * foto original (una sola vez, para no entrar en bucle si la original también falla).
 */
export function onImageVariantError(event: Event, originalUrl: string): void {
  const img = event.target as HTMLImageElement | null
  if (!img || img.dataset.variantFallback === '1') return
  img.dataset.variantFallback = '1'
  img.removeAttribute('srcset')
  img.src = originalUrl
}
