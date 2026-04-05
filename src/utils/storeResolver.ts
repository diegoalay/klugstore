// ============================================
// Store resolver
// ============================================
// Resuelve el slug de la tienda a partir del hostname actual.
// El objetivo: dominios custom NO tienen slug en la URL (/catalog,
// /about), porque el slug se infiere del hostname.
//
// Reglas (en orden de prioridad):
//   1. Mapeo explícito de dominios custom (DOMAIN_MAP) — apex sin subdominio en la URL
//   2. {slug}.localhost — desarrollo multi-tenant (ej. sweethome.localhost)
//   3. localhost / 127.0.0.1 sin subdominio → DEFAULT_SLUG
//   4. {slug}.klugstore.app | {slug}.klugstore.com
//   5. DEFAULT_SLUG
// ============================================

const DEFAULT_SLUG = 'sweethome'

// Dominios de producción explícitamente mapeados a un slug de tienda.
const DOMAIN_MAP: Record<string, string> = {
  'sweethome.com.gt': 'sweethome',
  'www.sweethome.com.gt': 'sweethome',
  // Dominios de Firebase Hosting (preview / default) también apuntan a sweethome.
  'sweet-home-gt.web.app': 'sweethome',
  'sweet-home-gt.firebaseapp.com': 'sweethome',
}

// Hostnames de desarrollo que siempre resuelven al default.
const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

export function resolveStoreSlug(hostname?: string): string {
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : ''))
    .toLowerCase()
    .trim()

  if (!host) return DEFAULT_SLUG

  // 1. Mapeo explícito (dominio propio → slug)
  const explicit = DOMAIN_MAP[host]
  if (explicit) return explicit

  // 2. {slug}.localhost → slug (dev con varias tiendas)
  const localhostMatch = /^([a-z0-9-]+)\.localhost$/i.exec(host)
  if (localhostMatch?.[1]) return localhostMatch[1].toLowerCase()

  // 3. localhost / 127.0.0.1 sin subdominio
  if (DEV_HOSTS.has(host)) return DEFAULT_SLUG

  // 4. {slug}.klugstore.app | {slug}.klugstore.com
  const parts = host.split('.')
  if (parts.length >= 3) {
    const root = parts.slice(-2).join('.')
    if (root === 'klugstore.app' || root === 'klugstore.com') {
      return (parts[0] ?? DEFAULT_SLUG).toLowerCase()
    }
  }

  // 5. Fallback
  return DEFAULT_SLUG
}
