// ============================================
// Normalización de nombres de íconos Font Awesome
// ============================================
// El editor del catálogo escribe iconos en formato corto desde Google Sheets
// o desde el JSON, y este helper los convierte al formato completo que Quasar
// y Font Awesome esperan (`fa-solid fa-<nombre>`).
//
// Reglas:
//
//   1. Vacío o whitespace     → undefined (sin ícono)
//   2. Ya trae estilo completo (`fa-solid fa-X`, `fa-regular fa-X`, `fa-light fa-X`,
//      `fa-thin fa-X`, `fa-duotone fa-X`, `fa-brands fa-X`) → se respeta tal cual
//   3. Empieza con `fa-` sin estilo (ej. `fa-faucet`) → se antepone `fa-solid`
//   4. Nombre plano (ej. `faucet`, `wine-bottle`)        → se convierte a
//      `fa-solid fa-<nombre>`
//
// Ejemplos:
//   normalizeIconName('faucet')                 → 'fa-solid fa-faucet'
//   normalizeIconName('wine-bottle')            → 'fa-solid fa-wine-bottle'
//   normalizeIconName('fa-faucet')              → 'fa-solid fa-faucet'
//   normalizeIconName('fa-solid fa-faucet')     → 'fa-solid fa-faucet'  (respeta explícito)
//   normalizeIconName('fa-regular fa-heart')    → 'fa-regular fa-heart' (respeta explícito)
//   normalizeIconName('fa-brands fa-whatsapp')  → 'fa-brands fa-whatsapp'
//   normalizeIconName('   ')                    → undefined
//   normalizeIconName(undefined)                → undefined
// ============================================

const FA_STYLE_PREFIX_RE =
  /^fa-(solid|regular|light|thin|duotone|brands|sharp-solid|sharp-regular|sharp-light|sharp-thin)\s+fa-/

export function normalizeIconName(raw: string | undefined | null): string | undefined {
  if (raw == null) return undefined
  const trimmed = String(raw).trim()
  if (!trimmed) return undefined

  // 2. Ya tiene estilo completo → respetar
  if (FA_STYLE_PREFIX_RE.test(trimmed)) {
    return trimmed
  }

  // 3. Empieza con `fa-` pero sin estilo → agregar `fa-solid`
  if (trimmed.startsWith('fa-')) {
    return `fa-solid ${trimmed}`
  }

  // 4. Nombre plano → agregar prefijo completo con `fa-solid fa-`
  //    Tolerante con espacios ("wine bottle" → "wine-bottle").
  const slug = trimmed.toLowerCase().replace(/\s+/g, '-')
  return `fa-solid fa-${slug}`
}
