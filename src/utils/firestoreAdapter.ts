import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/boot/firebase'
import type { RawCatalog, RawCategory, RawProduct } from '@/utils/catalogData'

/**
 * Fuente de catálogo: Firestore.
 *
 * Esquema (colección `stores`):
 *   stores/{slug}                       → campos de tienda (ver abajo)
 *   stores/{slug}/categories/{catSlug}  → RawCategory (sin `slug`, es el id del doc)
 *   stores/{slug}/products/{productId}  → RawProduct (sin `id`, es el id del doc)
 *
 * Si el doc `stores/{slug}` no existe (tienda no migrada todavía), devuelve
 * `null` y el resolver sigue con la siguiente fuente (Sheets → JSON remoto →
 * JSON empaquetado). Nunca lanza — cualquier error de red/permiso cae a la
 * siguiente fuente igual que las demás.
 */
export async function fetchCatalogFromFirestore(slug: string): Promise<RawCatalog | null> {
  try {
    const storeRef = doc(db, 'stores', slug)
    const storeSnap = await getDoc(storeRef)
    if (!storeSnap.exists()) return null

    const storeData = storeSnap.data() as Omit<RawCatalog, 'store' | 'categories' | 'products'>

    const [categoriesSnap, productsSnap] = await Promise.all([
      getDocs(query(collection(db, 'stores', slug, 'categories'), orderBy('order', 'asc'))),
      getDocs(collection(db, 'stores', slug, 'products')),
    ])

    const categories: RawCategory[] = categoriesSnap.docs.map((d) => {
      const data = d.data() as Omit<RawCategory, 'slug'>
      return { ...data, slug: d.id }
    })

    const products: RawProduct[] = productsSnap.docs.map((d) => {
      const data = d.data() as Omit<RawProduct, 'id'>
      return { ...data, id: d.id }
    })

    return {
      ...storeData,
      store: slug,
      categories,
      products,
    }
  } catch (err) {
    console.warn(`[catalog] Firestore fetch ${slug} failed:`, err)
    return null
  }
}
