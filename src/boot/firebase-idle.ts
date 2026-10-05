import { defineBoot } from '#q-app'
import { loadFirebaseWhenIdle } from '@/utils/firebaseLazy'

/**
 * Firebase ya no se carga al arrancar (ver utils/firebaseLazy.ts): aquí solo se agenda para
 * cuando el navegador quede libre, así Analytics registra la visita y la sesión de admin se
 * detecta sin frenar la primera pintura. Las rutas /admin lo cargan de inmediato desde el
 * guard del router.
 */
export default defineBoot(() => {
  if (typeof window === 'undefined') return
  void loadFirebaseWhenIdle()
})
