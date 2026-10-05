import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore'
import { db } from '@/boot/firebase'
import { resolveCatalogSlug } from '@/utils/catalogData'

export type InstagramPostStatus = 'pending' | 'imported' | 'ignored'

/** Post sincronizado por `npm run sync:instagram` (colección privada). */
export interface InstagramPost {
  id: string
  caption: string
  permalink: string
  postedAt: string
  imageUrls: string[]
  status: InstagramPostStatus
  productId?: string
}

export const useAdminInstagramStore = defineStore('adminInstagram', () => {
  const posts = ref<InstagramPost[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  const postsRef = () => collection(db, 'stores', resolveCatalogSlug(), 'instagramPosts')

  const countByStatus = computed(() => {
    const counts: Record<InstagramPostStatus, number> = { pending: 0, imported: 0, ignored: 0 }
    for (const p of posts.value) counts[p.status]++
    return counts
  })

  async function load() {
    loading.value = true
    try {
      const snap = await getDocs(query(postsRef(), orderBy('postedAt', 'desc')))
      posts.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InstagramPost, 'id'>) }))
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function setStatus(postId: string, status: InstagramPostStatus, productId?: string) {
    const data: Partial<InstagramPost> = { status }
    if (productId) data.productId = productId
    await updateDoc(doc(postsRef(), postId), data)
    posts.value = posts.value.map((p) => (p.id === postId ? { ...p, ...data } : p))
  }

  /** Un post puntual (p. ej. el de un producto), sin cargar la lista completa. */
  async function fetchPost(postId: string): Promise<InstagramPost | null> {
    const cached = posts.value.find((p) => p.id === postId)
    if (cached) return cached
    const snap = await getDoc(doc(postsRef(), postId))
    return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<InstagramPost, 'id'>) } : null
  }

  return { posts, loading, loaded, countByStatus, load, setStatus, fetchPost }
})
