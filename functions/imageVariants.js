/**
 * Variantes WebP de las fotos de producto — fuente única de la convención de nombres.
 *
 * La usan:
 *  - functions/index.js (optimizeProductImage / cleanupProductImageVariants): cada foto
 *    nueva en Storage genera sus variantes sola.
 *  - scripts/optimize-product-images.mjs: backfill de las fotos que ya existían.
 * El front (src/utils/imageVariants.ts → variantStoragePath / IMAGE_VARIANT_WIDTHS) arma la
 * misma ruta a partir de la URL original: si se cambia algo aquí, cambiarlo también allá.
 *
 *   stores/{store}/products/{id}/{nombre}.{ext}
 *     → stores/{store}/products/{id}/variants/{nombre}_{ancho}.webp
 */
import sharp from 'sharp'

export const VARIANT_WIDTHS = [480, 720, 1080]

/**
 * 7 días y no "immutable": algunos nombres se reutilizan al reimportar (instagram-N.jpg,
 * migrated-N.*); con un año de caché, quien ya vio la foto vieja la seguiría viendo.
 */
export const IMAGE_CACHE_CONTROL = 'public, max-age=604800, stale-while-revalidate=86400'

const PRODUCT_IMAGE = /^stores\/[^/]+\/products\/[^/]+\/.+/

/** ¿Es una foto original de producto (no una variante) que vale la pena optimizar? */
export function isOptimizableProductImage(name, contentType) {
  return (
    PRODUCT_IMAGE.test(name) &&
    !name.includes('/variants/') &&
    typeof contentType === 'string' &&
    contentType.startsWith('image/') &&
    contentType !== 'image/svg+xml' &&
    contentType !== 'image/gif'
  )
}

export function variantPath(originalPath, width) {
  const slash = originalPath.lastIndexOf('/')
  const base = originalPath.slice(slash + 1).replace(/\.[^.]+$/, '')
  return `${originalPath.slice(0, slash)}/variants/${base}_${width}.webp`
}

/** Redimensiona a `width` (sin agrandar), corrige la orientación EXIF y exporta WebP. */
export function renderVariant(buffer, width) {
  return sharp(buffer).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer()
}

/** Metadata de una variante; `sourceGeneration` permite saber si la original cambió. */
export function variantMetadata(sourceGeneration) {
  return {
    contentType: 'image/webp',
    cacheControl: IMAGE_CACHE_CONTROL,
    metadata: { sourceGeneration: String(sourceGeneration) },
  }
}
