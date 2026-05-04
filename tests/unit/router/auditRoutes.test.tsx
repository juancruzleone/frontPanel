import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { generateRoleSpecificRoutes } from '../../../src/router/createTranslatedRouter'
import { routeTranslations } from '../../../src/router/routeTranslations'
import { ROLES } from '../../../src/shared/utils/roleUtils'

interface ProtectedRouteElementProps {
  allowedRoles?: string[]
}

const getAllowedRoles = (element: unknown): string[] => {
  if (!isValidElement(element)) return []

  return (element as ReactElement<ProtectedRouteElementProps>).props.allowedRoles ?? []
}

describe('audit routes', () => {
  it('allows admin and super_admin on every translated audit route', () => {
    const auditPaths = new Set(Object.values(routeTranslations).map((translations) => translations.audit))
    const auditRoutes = generateRoleSpecificRoutes().filter((route) => auditPaths.has(String(route.path)))

    expect(auditRoutes.length).toBeGreaterThan(0)

    auditRoutes.forEach((route) => {
      expect(getAllowedRoles(route.element)).toEqual(expect.arrayContaining([ROLES.ADMIN, ROLES.SUPER_ADMIN]))
    })
  })
})
