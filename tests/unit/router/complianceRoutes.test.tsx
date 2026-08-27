import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { routeTranslations } from '../../../src/router/routeTranslations'
import { createTranslatedRouter } from '../../../src/router/createTranslatedRouter'
import es from '../../../src/i18n/locales/es.json'
import en from '../../../src/i18n/locales/en.json'

interface RouteNode {
  path?: string
  children?: RouteNode[]
  element?: unknown
}

const normalizePath = (p: string): string => p.replace(/^\/+/, "")

const collectPaths = (routes: RouteNode[]): string[] => {
  const paths: string[] = []
  const walk = (nodes: RouteNode[]) => {
    for (const node of nodes) {
      if (node.path) paths.push(normalizePath(node.path))
      if (node.children) walk(node.children)
    }
  }
  walk(routes)
  return paths
}

const getSection = (element: unknown): string | undefined => {
  if (!isValidElement(element)) return undefined
  return (element as ReactElement<{ section?: string }>).props.section
}

describe('compliance route', () => {
  it('define la clave compliance en todas las traducciones de ruta', () => {
    const languages = Object.keys(routeTranslations)
    expect(languages.length).toBeGreaterThan(0)

    for (const lang of languages) {
      const path = routeTranslations[lang].compliance
      expect(path).toBeTruthy()
      expect(path.startsWith('/')).toBe(false)
    }
  })

  it('registra la ruta traducida de compliance protegida por la sección cumplimiento', () => {
    const router = createTranslatedRouter()
    const paths = collectPaths(router.routes as RouteNode[])

    for (const lang of Object.keys(routeTranslations)) {
      expect(paths).toContain(routeTranslations[lang].compliance)
    }

    // El elemento de la ruta es RoleProtectedRoute con section="cumplimiento"
    const compliancePaths = new Set(
      Object.values(routeTranslations).map((t) => t.compliance),
    )
    let matched = 0
    const walk = (nodes: RouteNode[]): void => {
      for (const node of nodes) {
        if (node.path && compliancePaths.has(normalizePath(node.path))) {
          expect(getSection(node.element)).toBe('cumplimiento')
          matched += 1
        }
        if (node.children) walk(node.children)
      }
    }
    walk(router.routes as RouteNode[])
    expect(matched).toBeGreaterThan(0)
  })

  it('define el namespace compliance.* en es y en', () => {
    expect(es.compliance.title).toBeTruthy()
    expect(en.compliance.title).toBeTruthy()
    expect(es.nav.compliance).toBeTruthy()
    expect(en.nav.compliance).toBeTruthy()
  })
})