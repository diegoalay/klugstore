import type { CatalogData, Category, Product, ProductImage } from 'src/types'
import sweethomeJson from 'app/data/products/sweethome.json'
import { slugifyCatalogText } from 'src/utils/slugify'

// CDN público donde viven los assets (imágenes + logos) de SweetHome
const CDN_BASE = 'https://klugsystem-public-storage.s3.us-east-1.amazonaws.com/sweethome/assets/'

const SWEETHOME_LOGO = CDN_BASE + 'logos/sweethome-logo.webp'
const SWEETHOME_LOGO_WHITE = CDN_BASE + 'logos/sweethome-logo-white.webp'

interface RawProduct {
  id: string
  category: string
  name: string
  description: string
  measure?: string
  price: number
  tags?: string[]
  images: string[]
  discount?: string | null
  visible: boolean
}

interface RawCategory {
  slug: string
  name: string
  icon?: string
  order: number
}

interface RawCatalog {
  store: string
  name: string
  currency: string
  categories: RawCategory[]
  products: RawProduct[]
}

function mapCatalog(raw: RawCatalog): { categories: Category[]; products: Product[] } {
  const categories: Category[] = raw.categories.map((c) => {
    const cat: Category = {
      id: c.slug,
      name: c.name,
      slug: c.slug,
      order: c.order,
    }
    if (c.icon) cat.icon = c.icon
    return cat
  })

  const catNameBySlug = new Map(raw.categories.map((c) => [c.slug, c.name]))

  const products: Product[] = raw.products
    .filter((p) => p.visible !== false)
    .map((p, idx) => {
      const images: ProductImage[] = p.images.map((url, i) => ({
        url,
        alt: p.name,
        order: i + 1,
      }))

      const mapped: Product = {
        id: p.id,
        name: p.name,
        slug: slugifyCatalogText(p.name) + '-' + p.id,
        description: p.description,
        price: p.price,
        currency: raw.currency,
        images,
        categoryId: p.category,
        categoryName: catNameBySlug.get(p.category) ?? p.category,
        tags: p.tags ?? [],
        available: true,
        visible: p.visible !== false,
        featured: idx < 6,
        order: idx + 1,
      }
      if (p.measure) {
        mapped.shortDescription = p.measure
        mapped.measure = p.measure
      }
      if (p.discount) {
        mapped.discount = p.discount
      }
      return mapped
    })

  return { categories, products }
}

export function getMockCatalog(storeSlug?: string): CatalogData {
  void storeSlug
  const { categories, products } = mapCatalog(sweethomeJson as RawCatalog)

  return {
    store: {
      id: 'sweethome-01',
      name: 'SweetHome GT',
      slug: 'sweethome',
      description:
        'Transforma tu espacio con decoración única. Jarrones, trays, tablas de queso y piezas artesanales para cada rincón de tu hogar.',
      logo: SWEETHOME_LOGO,
      logoInverse: SWEETHOME_LOGO_WHITE,
      whatsappNumber: '50258705804',
      whatsappMessage: 'Hola! Vi un producto en su catálogo y me interesa.',
      currency: 'GTQ',
      locale: 'es-GT',
      theme: {
        primaryColor: '#000000',
        secondaryColor: '#d19793',
        accentColor: '#e9e3ca',
        backgroundColor: '#f5f5f5',
        surfaceColor: '#ffffff',
        textColor: '#000000',
        textSecondaryColor: '#6b6b6b',
        headerStyle: 'solid',
        cardStyle: 'elevated',
        borderRadius: 16,
      },
      socialLinks: {
        instagram: 'https://www.instagram.com/sweethome.gt_',
        facebook: 'https://www.facebook.com/profile.php?id=100091776825836',
        whatsapp: 'https://wa.me/50258705804',
      },
    },
    categories,
    products,
  }
}
