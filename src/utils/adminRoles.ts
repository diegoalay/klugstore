/**
 * Roles del admin. Se guardan como número en stores/{store}/users/{uid}.role.
 * Por ahora solo existe 0 = administrador (acceso total); las reglas de Firestore,
 * Storage y las Cloud Functions usan el mismo valor.
 */
export const ROLE_ADMIN = 0

export const ADMIN_ROLES = [{ value: ROLE_ADMIN, label: 'Administrador' }] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]['value']

export function roleLabel(role: number): string {
  return ADMIN_ROLES.find((r) => r.value === role)?.label ?? `Rol ${role}`
}

export interface AdminProfile {
  email: string
  displayName: string
  role: number
  active: boolean
}

export function isActiveAdmin(profile: AdminProfile | null | undefined): boolean {
  return !!profile && profile.role === ROLE_ADMIN && profile.active === true
}
