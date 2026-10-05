/**
 * Administración de usuarios del admin de SweetHome.
 *
 * El registro público de Firebase Auth está deshabilitado, así que las cuentas solo se
 * pueden crear con el Admin SDK: estas funciones lo hacen en nombre de un admin.
 *
 * Perfil y rol viven en Firestore: stores/{store}/users/{uid}
 *   { email, displayName, role, active, createdAt, createdBy }
 * Roles: 0 = administrador (por ahora el único). Las reglas de Firestore/Storage
 * solo dan permisos a un perfil con role 0 y active true; el cliente nunca escribe
 * estos documentos directamente.
 */
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onObjectDeleted, onObjectFinalized } from 'firebase-functions/v2/storage'
import { getStorage } from 'firebase-admin/storage'
import { logger } from 'firebase-functions'
import {
  IMAGE_CACHE_CONTROL,
  VARIANT_WIDTHS,
  isOptimizableProductImage,
  renderVariant,
  variantMetadata,
  variantPath,
} from './imageVariants.js'

initializeApp()

const STORE = 'sweethome'
const ROLE_ADMIN = 0
const ROLES = new Set([ROLE_ADMIN])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Las callables necesitan invocación pública en Cloud Run; la autorización la hace
 * assertAdmin(). Explícito porque un primer deploy fallido dejó updateAdminUser y
 * deleteAdminUser sin ese permiso (el navegador lo reportaba como error de CORS).
 */
const CALLABLE = { invoker: 'public' }

const usersCol = () => getFirestore().collection('stores').doc(STORE).collection('users')

async function assertAdmin(request) {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión primero.')
  const snap = await usersCol().doc(uid).get()
  const data = snap.data()
  if (!data || data.role !== ROLE_ADMIN || data.active !== true) {
    throw new HttpsError('permission-denied', 'Tu cuenta no tiene permisos de administrador.')
  }
  return uid
}

function cleanName(value) {
  const name = String(value ?? '').trim()
  if (name.length < 2 || name.length > 80) {
    throw new HttpsError('invalid-argument', 'El nombre debe tener entre 2 y 80 caracteres.')
  }
  return name
}

function cleanRole(value) {
  const role = Number(value ?? ROLE_ADMIN)
  if (!ROLES.has(role)) throw new HttpsError('invalid-argument', 'Rol inválido.')
  return role
}

/** Debe quedar al menos un administrador activo además del afectado. */
async function assertAnotherActiveAdmin(uid) {
  const snap = await usersCol().where('role', '==', ROLE_ADMIN).where('active', '==', true).get()
  if (!snap.docs.some((d) => d.id !== uid)) {
    throw new HttpsError('failed-precondition', 'Debe quedar al menos un administrador activo.')
  }
}

export const createAdminUser = onCall(CALLABLE, async (request) => {
  const callerUid = await assertAdmin(request)
  const email = String(request.data?.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(request.data?.password ?? '')
  const displayName = cleanName(request.data?.displayName)
  const role = cleanRole(request.data?.role)

  if (!EMAIL_RE.test(email)) throw new HttpsError('invalid-argument', 'Correo inválido.')
  if (password.length < 8) {
    throw new HttpsError(
      'invalid-argument',
      'La contraseña temporal debe tener al menos 8 caracteres.',
    )
  }

  let user
  try {
    user = await getAuth().createUser({ email, password, displayName })
  } catch (err) {
    if (err?.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Ya existe una cuenta con ese correo.')
    }
    throw new HttpsError('internal', 'No se pudo crear la cuenta.')
  }

  await usersCol().doc(user.uid).set({
    email,
    displayName,
    role,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: callerUid,
  })
  return { uid: user.uid }
})

export const updateAdminUser = onCall(CALLABLE, async (request) => {
  const callerUid = await assertAdmin(request)
  const uid = String(request.data?.uid ?? '')
  const ref = usersCol().doc(uid)
  const snap = await ref.get()
  if (!uid || !snap.exists) throw new HttpsError('not-found', 'Usuario no encontrado.')

  const patch = {}
  const authPatch = {}
  if (request.data?.displayName !== undefined) {
    patch.displayName = authPatch.displayName = cleanName(request.data.displayName)
  }
  if (request.data?.role !== undefined) patch.role = cleanRole(request.data.role)
  if (request.data?.active !== undefined) {
    const active = request.data.active === true
    if (!active) {
      if (uid === callerUid)
        throw new HttpsError('failed-precondition', 'No puedes desactivar tu propia cuenta.')
      await assertAnotherActiveAdmin(uid)
    }
    patch.active = active
    authPatch.disabled = !active
  }
  if (!Object.keys(patch).length) return { uid }

  if (Object.keys(authPatch).length) await getAuth().updateUser(uid, authPatch)
  // Al desactivar se cierran sus sesiones abiertas.
  if (patch.active === false) await getAuth().revokeRefreshTokens(uid)
  await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp(), updatedBy: callerUid })
  return { uid }
})

export const deleteAdminUser = onCall(CALLABLE, async (request) => {
  const callerUid = await assertAdmin(request)
  const uid = String(request.data?.uid ?? '')
  if (!uid) throw new HttpsError('invalid-argument', 'Falta el usuario.')
  if (uid === callerUid)
    throw new HttpsError('failed-precondition', 'No puedes eliminar tu propia cuenta.')
  await assertAnotherActiveAdmin(uid)

  try {
    await getAuth().deleteUser(uid)
  } catch (err) {
    if (err?.code !== 'auth/user-not-found')
      throw new HttpsError('internal', 'No se pudo eliminar la cuenta.')
  }
  await usersCol().doc(uid).delete()
  return { uid }
})

// ---------------------------------------------------------------------------
// Fotos de producto: variantes WebP automáticas (ver imageVariants.js).
// Cada foto que entra a stores/{store}/products/{id}/ (subida desde el admin, importada de
// Instagram o migrada) genera sus variantes de 480 y 1080 px. Las variantes se escriben en
// .../variants/, que la función ignora: así no se dispara a sí misma.
// ---------------------------------------------------------------------------
const IMAGE_BUCKET = 'sweet-home-gt.firebasestorage.app'
const imageTriggerOpts = { bucket: IMAGE_BUCKET, region: 'us-central1', memory: '1GiB', timeoutSeconds: 120 }

export const optimizeProductImage = onObjectFinalized(imageTriggerOpts, async (event) => {
  const { name, contentType, generation, cacheControl } = event.data
  if (!name || !isOptimizableProductImage(name, contentType)) return

  const original = getStorage().bucket(event.data.bucket).file(name)
  const [buffer] = await original.download()
  for (const width of VARIANT_WIDTHS) {
    const out = await renderVariant(buffer, width)
    await getStorage()
      .bucket(event.data.bucket)
      .file(variantPath(name, width))
      .save(out, { resumable: false, metadata: variantMetadata(generation) })
  }
  // Cambiar metadata no vuelve a disparar onObjectFinalized (eso es onMetadataUpdated).
  if (cacheControl !== IMAGE_CACHE_CONTROL) await original.setMetadata({ cacheControl: IMAGE_CACHE_CONTROL })
  logger.info('Variantes generadas', { name, widths: VARIANT_WIDTHS })
})

export const cleanupProductImageVariants = onObjectDeleted(
  { bucket: IMAGE_BUCKET, region: 'us-central1' },
  async (event) => {
    const { name, contentType } = event.data
    if (!name || !isOptimizableProductImage(name, contentType)) return
    const bucket = getStorage().bucket(event.data.bucket)
    await Promise.all(
      VARIANT_WIDTHS.map((width) => bucket.file(variantPath(name, width)).delete({ ignoreNotFound: true })),
    )
  },
)
