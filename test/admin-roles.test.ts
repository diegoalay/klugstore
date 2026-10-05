import { describe, expect, it } from 'vitest'
import { ROLE_ADMIN, isActiveAdmin, roleLabel } from '@/utils/adminRoles'

describe('admin roles', () => {
  it('treats only an active role 0 profile as admin', () => {
    const base = { email: 'a@b.gt', displayName: 'A', role: ROLE_ADMIN, active: true }
    expect(isActiveAdmin(base)).toBe(true)
    expect(isActiveAdmin({ ...base, active: false })).toBe(false)
    expect(isActiveAdmin({ ...base, role: 1 })).toBe(false)
    expect(isActiveAdmin(null)).toBe(false)
  })

  it('labels role 0 as Administrador and falls back for unknown roles', () => {
    expect(roleLabel(0)).toBe('Administrador')
    expect(roleLabel(7)).toBe('Rol 7')
  })
})
