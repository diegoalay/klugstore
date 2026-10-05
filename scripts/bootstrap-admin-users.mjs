/**
 * Crea el perfil de administrador (role 0, active true) en stores/sweethome/users/{uid}
 * para cada cuenta de Firebase Auth que todavía no lo tenga.
 *
 * Hay que correrlo UNA vez antes de publicar las reglas con roles (firestore.rules /
 * storage.rules): hasta ahora toda cuenta de Auth era admin, y con las reglas nuevas
 * una cuenta sin perfil se queda sin acceso. No modifica perfiles existentes.
 *
 *   node scripts/bootstrap-admin-users.mjs          # muestra lo que haría
 *   node scripts/bootstrap-admin-users.mjs --apply  # escribe
 *
 * Requiere ./serviceAccountKey.json.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const STORE = 'sweethome'
const ROLE_ADMIN = 0
const apply = process.argv.includes('--apply')

initializeApp({
  credential: cert(JSON.parse(readFileSync(join(root, 'serviceAccountKey.json'), 'utf8'))),
})

const users = getFirestore().collection('stores').doc(STORE).collection('users')
let pageToken
let created = 0

do {
  const page = await getAuth().listUsers(1000, pageToken)
  for (const u of page.users) {
    const ref = users.doc(u.uid)
    if ((await ref.get()).exists) {
      console.log(`= ${u.email} ya tiene perfil`)
      continue
    }
    console.log(
      `${apply ? '+' : '~'} ${u.email} → administrador${u.disabled ? ' (desactivado)' : ''}`,
    )
    if (apply) {
      await ref.set({
        email: (u.email ?? '').toLowerCase(),
        displayName: u.displayName ?? (u.email ?? '').split('@')[0],
        role: ROLE_ADMIN,
        active: !u.disabled,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: 'bootstrap',
      })
    }
    created++
  }
  pageToken = page.pageToken
} while (pageToken)

console.log(
  apply
    ? `\n${created} perfil(es) creado(s).`
    : `\n${created} perfil(es) por crear. Corre con --apply.`,
)
