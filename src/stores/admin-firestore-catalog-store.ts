import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/boot/firebase'
import type { Product, ProductImage, ProductSource } from '@/types'
import { resolveCatalogSlug } from '@/utils/catalogData'
import { productSlug } from '@/utils/slugify'
import {
  ADMIN_CATALOG_SORT_OPTIONS,
  applyAdminCatalogSort,
  type AdminCatalogSortMode,
} from '@/utils/catalogSort'

export interface AdminCategory {
  slug: string
  name: string
  icon?: string
  order: number
}

/** Documento de producto tal como vive en Firestore (sin id, es el id del doc). */
export interface AdminProductDoc {
  category: string
  name: string
  description: string
  measure?: string
  price: number
  images: ProductImage[]
  discount?: string | null
  visible: boolean
  sold?: boolean
  featured?: boolean
  tags?: string[]
  stock?: number
  source?: ProductSource
}

function docToProduct(id: string, data: AdminProductDoc, catNameBySlug: Map<string, string>): Product {
  const images = [...(data.images ?? [])].sort((a, b) => a.order - b.order)
  const sold = data.sold === true
  const visible = data.visible !== false
  const p: Product = {
    id,
    name: data.name,
    slug: productSlug(data.name, id),
    description: data.description ?? '',
    price: data.price ?? 0,
    currency: 'GTQ',
    images,
    categoryId: data.category,
    categoryName: catNameBySlug.get(data.category) ?? data.category,
    tags: data.tags ?? [],
    available: !sold,
    visible,
    featured: visible && !sold && data.featured === true,
    order: 0,
  }
  if (sold) p.sold = true
  if (data.measure) {
    p.measure = data.measure
    p.shortDescription = data.measure
  }
  if (data.discount) p.discount = data.discount
  if (typeof data.stock === 'number') p.stock = data.stock
  if (data.source) p.source = data.source
  return p
}

/**
 * Store admin que lee/escribe directo contra Firestore (reemplaza el
 * borrador en memoria + export CSV del MVP original). Cada guardado
 * persiste de inmediato — no hay paso de "exportar y aplicar" separado.
 */
export const useAdminFirestoreCatalogStore = defineStore('adminFirestoreCatalog', () => {
  const products = ref<Product[]>([])
  const categories = ref<AdminCategory[]>([])
  const loading = ref(false)
  const sourceReady = ref(false)
  const filter = ref('')
  const sortMode = ref<AdminCatalogSortMode>('name-asc')

  const catalogSlug = computed(() => resolveCatalogSlug())

  const categorySelectOptions = computed(() =>
    categories.value.map((c) => ({ value: c.slug, label: c.name })),
  )

  const filtered = computed(() => {
    const q = filter.value.trim().toLowerCase()
    const list = !q
      ? products.value
      : products.value.filter(
          (p) =>
            p.id.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            (p.categoryName && p.categoryName.toLowerCase().includes(q)),
        )
    return applyAdminCatalogSort(list, sortMode.value)
  })

  function storeRef() {
    return doc(db, 'stores', catalogSlug.value)
  }

  async function load() {
    loading.value = true
    sourceReady.value = false
    try {
      const [catSnap, prodSnap] = await Promise.all([
        getDocs(query(collection(storeRef(), 'categories'), orderBy('order', 'asc'))),
        getDocs(collection(storeRef(), 'products')),
      ])

      const cats: AdminCategory[] = catSnap.docs.map((d) => {
        const data = d.data() as Omit<AdminCategory, 'slug'>
        return { ...data, slug: d.id }
      })
      categories.value = cats

      const catNameBySlug = new Map(cats.map((c) => [c.slug, c.name]))
      products.value = prodSnap.docs.map((d) =>
        docToProduct(d.id, d.data() as AdminProductDoc, catNameBySlug),
      )

      sourceReady.value = true
    } catch (err) {
      console.error(err)
      products.value = []
      categories.value = []
      Notify.create({ type: 'negative', message: 'No se pudo cargar el catálogo desde Firestore' })
    } finally {
      loading.value = false
    }
  }

  function toDoc(p: Product): AdminProductDoc {
    const d: AdminProductDoc = {
      category: p.categoryId,
      name: p.name,
      description: p.description,
      price: Number(p.price) || 0,
      images: p.images.map((img, i) => ({ url: img.url, alt: img.alt ?? p.name, order: i })),
      visible: p.visible,
    }
    if (p.measure) d.measure = p.measure
    if (p.discount) d.discount = p.discount
    if (p.sold) d.sold = true
    if (p.featured) d.featured = true
    if (p.tags?.length) d.tags = p.tags
    if (typeof p.stock === 'number') d.stock = p.stock
    if (p.source) d.source = p.source
    return d
  }

  /**
   * Deja la copia local igual a lo que quedó en Firestore (misma conversión que
   * al cargar). Sin esto, reabrir un producto recién guardado mostraba los datos
   * anteriores hasta recargar la página.
   */
  function upsertLocal(id: string, data: AdminProductDoc) {
    const catNameBySlug = new Map(categories.value.map((c) => [c.slug, c.name]))
    const fresh = docToProduct(id, data, catNameBySlug)
    const idx = products.value.findIndex((x) => x.id === id)
    products.value =
      idx >= 0 ? products.value.map((x, i) => (i === idx ? fresh : x)) : [...products.value, fresh]
  }

  async function saveProduct(p: Product): Promise<void> {
    const data = toDoc(p)
    await setDoc(doc(storeRef(), 'products', p.id), { ...data, updatedAt: serverTimestamp() }, { merge: false })
    upsertLocal(p.id, data)
  }

  async function createProduct(id: string, p: Product): Promise<void> {
    const data = toDoc(p)
    await setDoc(doc(storeRef(), 'products', id), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    upsertLocal(id, data)
  }

  async function deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(storeRef(), 'products', id))
    products.value = products.value.filter((p) => p.id !== id)
  }

  async function saveCategory(cat: AdminCategory): Promise<void> {
    const { slug, ...data } = cat
    await setDoc(doc(storeRef(), 'categories', slug), data)
    const idx = categories.value.findIndex((c) => c.slug === slug)
    if (idx >= 0) categories.value[idx] = cat
    else categories.value = [...categories.value, cat]
  }

  async function deleteCategory(slug: string): Promise<void> {
    await deleteDoc(doc(storeRef(), 'categories', slug))
    categories.value = categories.value.filter((c) => c.slug !== slug)
  }

  function reset() {
    products.value = []
    categories.value = []
    loading.value = false
    sourceReady.value = false
    filter.value = ''
    sortMode.value = 'name-asc'
  }

  return {
    products,
    categories,
    loading,
    sourceReady,
    filter,
    sortMode,
    catalogSlug,
    categorySelectOptions,
    filtered,
    ADMIN_CATALOG_SORT_OPTIONS,
    load,
    saveProduct,
    createProduct,
    deleteProduct,
    saveCategory,
    deleteCategory,
    reset,
  }
})
