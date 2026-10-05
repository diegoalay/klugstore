import { defineBoot } from '#q-app'
import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const storage = getStorage(app)
export const auth = getAuth(app)

/**
 * Analytics solo en browser real (no SSR) y si el navegador lo soporta.
 * Resuelve a undefined si está bloqueado (ad-blocker) — no es crítico.
 */
export const analyticsReady: Promise<Analytics | undefined> =
  typeof window === 'undefined'
    ? Promise.resolve(undefined)
    : isAnalyticsSupported()
        .then((supported) => (supported ? getAnalytics(app) : undefined))
        .catch(() => undefined)

export default defineBoot(() => {
  // Firestore/Storage/Auth/Analytics se inicializan al importar el módulo
})
