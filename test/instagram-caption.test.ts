import { describe, expect, it } from 'vitest'
import {
  findSimilarName,
  nameSimilarity,
  parseInstagramCaption,
  suggestCategory,
  updateCaptionForProduct,
} from '@/utils/instagramCaption'

describe('Instagram caption parsing', () => {
  it('keeps a short product name and reads the quetzal price', () => {
    const s = parseInstagramCaption(
      '🎄 Linterna de agua navideña estilo farol con Santa Claus, llena de purpurina brillante.\nPrecio: Q165\n#navidad #decoracion',
    )
    expect(s.name).toBe('Linterna de agua navideña estilo farol con Santa Claus')
    expect(s.price).toBe(165)
    expect(s.sold).toBe(false)
    expect(s.tags).toEqual(['navidad', 'decoracion'])
  })

  it('turns a leading VENDIDO into a flag instead of part of the name', () => {
    const s = parseInstagramCaption('VENDIDODecoración navideña de hombre de nieve de resina\nQ200')
    expect(s.sold).toBe(true)
    expect(s.name).toBe('Decoración navideña de hombre de nieve de resina')
  })

  it('detects VENDIDO after emojis or an opening exclamation mark', () => {
    for (const caption of ['‼️VENDIDO Bandeja de metal giratoria\nQ150', '¡VENDIDO Dale la bienvenida al otoño\nQ100', 'VENDIDAS Cúpula de cristal\nQ150']) {
      const s = parseInstagramCaption(caption)
      expect(s.sold).toBe(true)
      expect(s.name).not.toMatch(/vendid/i)
    }
  })

  it('extracts the measurements line', () => {
    const s = parseInstagramCaption('Bandeja de bambú con divisores\nMedidas: 25 cm de diámetro\nQ 150')
    expect(s.measure).toBe('25 cm de diámetro')
    expect(s.price).toBe(150)
  })

  it('handles thousands separators and missing prices', () => {
    expect(parseInstagramCaption('Mesa auxiliar Q1,250').price).toBe(1250)
    expect(parseInstagramCaption('Nueva colección de otoño').price).toBeNull()
  })

  it('cuts very long first sentences on a word boundary', () => {
    const s = parseInstagramCaption(
      'Añade toques de alegría navideña a tu hogar con este brillante adorno de resina pintado a mano por artesanos',
    )
    expect(s.name.length).toBeLessThanOrEqual(60)
    expect(s.name.endsWith(' ')).toBe(false)
  })
})

describe('possible duplicates', () => {
  it('scores the same piece reposted in another season as similar', () => {
    expect(
      nameSimilarity(
        'Adorno navideño de cascanueces, decoración de madera',
        'Adorno navideño de cascanueces color dorado',
      ),
    ).toBeGreaterThan(0.4)
  })

  it('treats different set sizes as different products', () => {
    expect(nameSimilarity('Set 6 Candeleros de metal color dorado', 'Set de 3 candeleros de metal color dorado')).toBe(0)
  })

  it('finds the closest existing product above the threshold', () => {
    const existing = ['Set de 6 Candeleros Dorados', 'Bandeja Bambú con Divisores y Bowl']
    expect(findSimilarName('Bandeja de bambú con divisores', existing)).toBe('Bandeja Bambú con Divisores y Bowl')
    expect(findSimilarName('Reno navideño de cerámica', existing)).toBeNull()
  })
})

describe('category suggestion', () => {
  const slugs = ['christmas-season', 'autumn-season', 'trays', 'candle-holders', 'kitchen-decor', 'garden']

  it('prefers the season over the object type', () => {
    expect(suggestCategory('Bandeja navideña de cascanueces', slugs)).toBe('christmas-season')
    expect(suggestCategory('Calabaza decorativa con tapadera', slugs)).toBe('autumn-season')
  })

  it('maps object words to their category', () => {
    expect(suggestCategory('Set 3 Candeleros de metal', slugs)).toBe('candle-holders')
    expect(suggestCategory('Gnomo de jardín solar', slugs)).toBe('garden')
    expect(suggestCategory('Juego de cubiertos para 8', slugs)).toBe('kitchen-decor')
  })

  it('returns null when nothing matches or the category does not exist', () => {
    expect(suggestCategory('Producto misterioso', slugs)).toBeNull()
    expect(suggestCategory('Grifo estilo cascada', slugs)).toBeNull()
  })
})

describe('updating a post caption from the product', () => {
  it('adds VENDIDO and keeps the rest of the text', () => {
    const r = updateCaptionForProduct('Bandeja de acacia 🌿\nQ250\n#hogar', { sold: true, price: 250 })
    expect(r.caption).toBe('VENDIDO Bandeja de acacia 🌿\nQ250\n#hogar')
    expect(r.changed).toBe(true)
  })

  it('removes VENDIDO when the piece is available again', () => {
    expect(updateCaptionForProduct('VENDIDO Bandeja\nQ250', { sold: false, price: 250 }).caption).toBe('Bandeja\nQ250')
  })

  it('updates only the first price', () => {
    expect(updateCaptionForProduct('Set de 3\nPrecio: Q 300 (antes Q350)', { price: 275 }).caption).toBe(
      'Set de 3\nPrecio: Q 275 (antes Q350)',
    )
  })

  it('reports no change when the post is already up to date', () => {
    expect(updateCaptionForProduct('VENDIDO Bandeja\nQ250', { sold: true, price: 250 }).changed).toBe(false)
  })
})

describe('updating a post when the description or measure changed', () => {
  const original = '🎄 Adorno navideño de cascanueces, decoración de madera.\nMedidas: 30 cm de altura\nQ175\n#navidad #decoracion'

  it('does not report changes when the product still matches the post', () => {
    const s = parseInstagramCaption(original)
    const r = updateCaptionForProduct(original, { price: 175, description: s.description, measure: s.measure })
    expect(r.changed).toBe(false)
  })

  it('rebuilds from the product and keeps the hashtags when the description changed', () => {
    const r = updateCaptionForProduct(original, {
      price: 175,
      description: 'Adorno navideño de cascanueces de madera pintado a mano.',
      measure: '30 cm de altura',
    })
    expect(r.changed).toBe(true)
    expect(r.changes).toContain('Se actualiza la descripción')
    expect(r.caption).toContain('pintado a mano')
    expect(r.caption).toContain('Precio: Q175')
    expect(r.caption).toContain('#navidad #decoracion')
  })

  it('is stable: once pasted, checking again reports no changes', () => {
    const product = { sold: true, price: 190, description: 'Cascanueces de madera.', measure: '30 cm de altura' }
    const pasted = updateCaptionForProduct(original, product).caption
    expect(updateCaptionForProduct(pasted, product).changed).toBe(false)
  })
})
