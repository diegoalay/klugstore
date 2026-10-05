import { defineBoot } from '#q-app'

// Font Awesome Pro — solo las familias que el código realmente usa
// (solid, regular, brands). `all.min.css` cargaba también light/thin/duotone
// sin usarlos, +100KB de CSS de más. Si algún día se usa otra familia
// (ej. `fa-light`), hay que agregar su import aquí explícitamente.
import '@fortawesome/fontawesome-pro/css/fontawesome.min.css'
import '@fortawesome/fontawesome-pro/css/solid.min.css'
import '@fortawesome/fontawesome-pro/css/regular.min.css'
import '@fortawesome/fontawesome-pro/css/brands.min.css'

export default defineBoot(() => {
  // Font Awesome Pro se carga automáticamente via los CSS imports
})
