import { ref, onMounted } from 'vue'
import { loadFirebaseWhenIdle } from '@/utils/firebaseLazy'

const isAdmin = ref(false)
let subscribed = false

/**
 * ¿Hay un admin con sesión iniciada? Estado compartido (un solo listener para
 * toda la app) y solo en cliente: en SSR queda en false, así el HTML público
 * nunca incluye controles de edición. Firebase se carga recién cuando el
 * navegador está libre (utils/firebaseLazy), así que `isAdmin` pasa a true un
 * momento después de la primera pintura.
 */
export function useAdminSession() {
  onMounted(() => {
    if (subscribed) return
    subscribed = true
    void Promise.all([loadFirebaseWhenIdle(), import('firebase/auth')]).then(
      ([{ auth }, { onAuthStateChanged }]) => {
        onAuthStateChanged(auth, (user) => (isAdmin.value = user !== null))
      },
    )
  })
  return { isAdmin }
}
