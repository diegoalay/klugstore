import { describe, expect, it } from 'vitest'
import { VARIANT_WIDTHS, isOptimizableProductImage, variantPath } from '../functions/imageVariants.js'
import {
  CARD_WIDTHS,
  IMAGE_VARIANT_WIDTHS,
  imageSrc,
  imageSrcset,
  imageVariantUrl,
  variantStoragePath,
} from '@/utils/imageVariants'

const ORIGINAL =
  'https://firebasestorage.googleapis.com/v0/b/sweet-home-gt.firebasestorage.app/o/stores%2Fsweethome%2Fproducts%2Fvases-26%2Finstagram-4.jpg?alt=media'

describe('image variants', () => {
  it('uses the same widths and paths as the Cloud Function / backfill script', () => {
    expect([...IMAGE_VARIANT_WIDTHS]).toEqual(VARIANT_WIDTHS)
    for (const path of ['stores/sweethome/products/vases-26/instagram-4.jpg', 'stores/s/products/x/1700-foto.final.png']) {
      for (const w of IMAGE_VARIANT_WIDTHS) expect(variantStoragePath(path, w)).toBe(variantPath(path, w))
    }
  })

  it('builds the public variant URL from the original Storage URL', () => {
    expect(imageVariantUrl(ORIGINAL, 480, true)).toBe(
      'https://firebasestorage.googleapis.com/v0/b/sweet-home-gt.firebasestorage.app/o/stores%2Fsweethome%2Fproducts%2Fvases-26%2Fvariants%2Finstagram-4_480.webp?alt=media',
    )
  })

  it('falls back to the original when disabled or not our Storage', () => {
    expect(imageSrc(ORIGINAL, 480, false)).toBe(ORIGINAL)
    expect(imageSrcset(ORIGINAL, CARD_WIDTHS, false)).toBeUndefined()
    expect(imageVariantUrl('https://example.com/a.jpg', 480, true)).toBeNull()
  })

  it('card srcset never offers the 1080 variant', () => {
    const srcset = imageSrcset(ORIGINAL, CARD_WIDTHS, true) ?? ''
    expect(srcset).toContain('480w')
    expect(srcset).toContain('720w')
    expect(srcset).not.toContain('1080w')
  })

  it('only optimizes original product photos (never its own variants)', () => {
    expect(isOptimizableProductImage('stores/sweethome/products/a-01/x.jpg', 'image/jpeg')).toBe(true)
    expect(isOptimizableProductImage('stores/sweethome/products/a-01/variants/x_480.webp', 'image/webp')).toBe(false)
    expect(isOptimizableProductImage('stores/sweethome/logo.png', 'image/png')).toBe(false)
    expect(isOptimizableProductImage('stores/sweethome/products/a-01/doc.pdf', 'application/pdf')).toBe(false)
  })
})
