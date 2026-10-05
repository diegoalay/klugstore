import { describe, expect, it } from 'vitest'
import { resolveAdminRedirect } from '@/router/adminGuard'

const adminRoute = { meta: { requiresAdmin: true }, fullPath: '/admin/catalogo?edit=vases-01' }
const loginRoute = { meta: { adminGuest: true }, fullPath: '/admin/login' }
const publicRoute = { meta: {}, fullPath: '/catalog' }

describe('admin route guard', () => {
  it('sends visitors without a session to login, remembering the target', () => {
    expect(resolveAdminRedirect(adminRoute, false)).toEqual({
      name: 'admin-login',
      query: { redirect: '/admin/catalogo?edit=vases-01' },
    })
  })

  it('lets admins with a session into the panel', () => {
    expect(resolveAdminRedirect(adminRoute, true)).toBeUndefined()
  })

  it('skips the login page when already signed in', () => {
    expect(resolveAdminRedirect(loginRoute, true)).toEqual({ name: 'admin-catalog' })
  })

  it('never redirects public routes', () => {
    expect(resolveAdminRedirect(publicRoute, false)).toBeUndefined()
    expect(resolveAdminRedirect(publicRoute, true)).toBeUndefined()
  })
})
