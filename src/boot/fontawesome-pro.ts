import { defineBoot } from '#q-app'

// Font Awesome Pro reducido a los íconos que usa la tienda (solid, regular y brands):
// lo genera scripts/build-fa-subset.mjs antes de `dev` y `build`. Las fuentes completas
// pesaban ~740 KB; el subconjunto ~17 KB. Si un ícono nuevo no aparece: `npm run fa:subset`.
import '@/css/fa-subset/fa-subset.css'

export default defineBoot(() => {
  // Font Awesome se carga con el CSS importado arriba
})
