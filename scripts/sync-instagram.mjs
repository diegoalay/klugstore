/**
 * Sincroniza los posts de Instagram (@sweethome.gt_) a Firestore, en la
 * colección PRIVADA stores/{slug}/instagramPosts/{postId} (solo admins).
 * Desde /admin/instagram se revisa cada post y se crea el producto a partir
 * de él, o se ignora. Este script no crea productos.
 *
 *   npm run sync:instagram            → incremental: solo posts nuevos desde la última sincronización
 *   npm run sync:instagram -- --full  → todo: también refresca textos y links de fotos
 *                                        (los de Instagram caducan en unos días)
 *
 * El estado de la integración vive en stores/{slug}/integrations/instagram
 * (lastSyncAt, lastPostedAt, …; ver docs/instagram-integration.md).
 * Re-correrlo es seguro: nunca toca el estado de cada post (pending/imported/ignored).
 *
 * Requiere ./.instagram-token (solo lectura, gitignored) y ./serviceAccountKey.json.
 * El token vive solo aquí, nunca en el navegador.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const STORE_SLUG = 'sweethome'

const tokenPath = join(root, '.instagram-token')
const token = existsSync(tokenPath) ? readFileSync(tokenPath, 'utf8').trim() : ''
if (!token) {
  console.error('✗ Falta el token en .instagram-token')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(readFileSync(join(root, 'serviceAccountKey.json'), 'utf8'))) })
const db = getFirestore()
const storeRef = db.collection('stores').doc(STORE_SLUG)
const postsRef = storeRef.collection('instagramPosts')
const integrationRef = storeRef.collection('integrations').doc('instagram')
const FULL = process.argv.includes('--full')

const FIELDS = 'id,caption,media_type,media_url,permalink,timestamp,children{media_type,media_url}'

/** La API devuelve de más nuevo a más viejo: en modo incremental se corta al llegar a lo ya sincronizado. */
async function fetchPosts(stopAtPostedAt) {
  const posts = []
  let url = `https://graph.instagram.com/me/media?fields=${encodeURIComponent(FIELDS)}&limit=50&access_token=${encodeURIComponent(token)}`
  while (url) {
    const res = await fetch(url)
    const body = await res.json()
    if (!res.ok) throw new Error(`Instagram API ${res.status}: ${body?.error?.message ?? 'error'}`)
    for (const post of body.data) {
      if (stopAtPostedAt && post.timestamp <= stopAtPostedAt) return posts
      posts.push(post)
    }
    url = body.paging?.next
  }
  return posts
}

function imageUrlsOf(post) {
  if (post.media_type === 'CAROUSEL_ALBUM') {
    return (post.children?.data ?? []).filter((c) => c.media_type === 'IMAGE').map((c) => c.media_url)
  }
  return post.media_type === 'IMAGE' ? [post.media_url] : []
}

async function main() {
  const integration = (await integrationRef.get()).data() ?? {}
  const since = FULL ? null : (integration.lastPostedAt ?? null)
  console.log(since ? `→ Posts nuevos desde ${since}…` : '→ Leyendo todos los posts de Instagram…')
  const fetched = await fetchPosts(since)
  const posts = fetched.filter((p) => imageUrlsOf(p).length > 0)
  const existingIds = new Set((await postsRef.select().get()).docs.map((d) => d.id))

  let created = 0
  let batch = db.batch()
  let ops = 0
  for (const post of posts) {
    const ref = postsRef.doc(post.id)
    const data = {
      caption: post.caption ?? '',
      permalink: post.permalink,
      postedAt: post.timestamp,
      imageUrls: imageUrlsOf(post),
      syncedAt: FieldValue.serverTimestamp(),
    }
    if (!existingIds.has(post.id)) {
      data.status = 'pending'
      created++
    }
    batch.set(ref, data, { merge: true })
    if (++ops === 400) {
      await batch.commit()
      batch = db.batch()
      ops = 0
    }
  }
  if (ops) await batch.commit()

  const newest = fetched[0]?.timestamp ?? integration.lastPostedAt ?? null
  await integrationRef.set(
    {
      lastSyncAt: FieldValue.serverTimestamp(),
      lastSyncMode: FULL ? 'full' : 'incremental',
      lastPostedAt: newest,
      lastSyncNewPosts: created,
    },
    { merge: true },
  )

  console.log(`✔ ${posts.length} posts con fotos sincronizados (${created} nuevos). Revísalos en /admin/instagram.`)
}

main().catch((err) => {
  console.error('✗', err.message)
  process.exit(1)
})
