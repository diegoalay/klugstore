/** MVP: sustituir por auth real al conectar klugsystem. */
export const ADMIN_USERNAME = 'admin'

export function getAdminPassword(): string {
  return import.meta.env.VITE_ADMIN_PASSWORD ?? 'sweethome'
}

export function tryAdminLogin(username: string, password: string): boolean {
  const u = username.trim().toLowerCase()
  return u === ADMIN_USERNAME.toLowerCase() && password === getAdminPassword()
}
