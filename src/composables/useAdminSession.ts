import { ref, onMounted } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/boot/firebase'

const isAdmin = ref(false)
let subscribed = false

/**
 * ¿Hay un admin con sesión iniciada? Estado compartido (un solo listener para
 * toda la app) y solo en cliente: en SSR queda en false, así el HTML público
 * nunca incluye controles de edición.
 */
export function useAdminSession() {
  onMounted(() => {
    if (subscribed) return
    subscribed = true
    onAuthStateChanged(auth, (user) => (isAdmin.value = user !== null))
  })
  return { isAdmin }
}
