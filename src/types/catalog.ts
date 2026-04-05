// ============================================
// KlugStore - Catalog Types
// ============================================

export interface StoreConfig {
  id: string
  name: string
  slug: string
  description: string
  logo: string
  logoInverse?: string
  banner?: string
  whatsappNumber: string
  whatsappMessage?: string
  currency: string
  locale: string
  theme: StoreTheme
  socialLinks?: SocialLinks
}

export interface StoreTheme {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  textSecondaryColor: string
  headerStyle: 'solid' | 'gradient' | 'image'
  cardStyle: 'elevated' | 'flat' | 'outlined'
  borderRadius: number
}

export interface SocialLinks {
  instagram?: string
  facebook?: string
  tiktok?: string
  whatsapp?: string
  website?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  icon?: string
  order: number
  productCount?: number
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  shortDescription?: string
  measure?: string
  price: number
  compareAtPrice?: number
  discount?: string | null
  currency: string
  images: ProductImage[]
  categoryId: string
  categoryName?: string
  tags?: string[]
  available: boolean
  visible: boolean
  /**
   * Producto vendido. Se muestra en el catálogo como prueba social
   * (con badge "Vendido") pero la acción de compra queda deshabilitada.
   * Diferencia con `visible: false`:
   *   - `visible: false` → se oculta completamente del catálogo
   *   - `sold: true`      → se muestra pero no se puede comprar
   */
  sold?: boolean
  featured?: boolean
  variants?: ProductVariant[]
  order: number
}

export interface ProductImage {
  url: string
  alt?: string
  order: number
}

export interface ProductVariant {
  id: string
  name: string
  price?: number
  available: boolean
}

export interface CatalogData {
  store: StoreConfig
  categories: Category[]
  products: Product[]
}
