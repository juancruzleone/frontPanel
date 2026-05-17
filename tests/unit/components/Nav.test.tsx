import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getRouteMenuOpenState } from '../../../src/shared/components/Nav/navRouteState'

const menuRoutes = {
  workOrders: ['/ordenes-trabajo', '/calendario'],
  maintenance: ['/plan-mantenimiento'],
  operation: ['/inventario', '/personal', '/proveedores'],
}

describe('Nav dropdown route state', () => {
  it('opens only the dropdown that contains the current child route', () => {
    expect(getRouteMenuOpenState('/ordenes-trabajo', menuRoutes)).toEqual({
      workOrders: true,
      maintenance: false,
      operation: false,
    })

    expect(getRouteMenuOpenState('/inventario', menuRoutes)).toEqual({
      workOrders: false,
      maintenance: false,
      operation: true,
    })
  })

  it('keeps all dropdowns closed for unrelated top-level routes', () => {
    expect(getRouteMenuOpenState('/inicio', menuRoutes)).toEqual({
      workOrders: false,
      maintenance: false,
      operation: false,
    })
  })

  it('matches nested child routes without matching similarly prefixed routes', () => {
    expect(getRouteMenuOpenState('/ordenes-trabajo/123', menuRoutes).workOrders).toBe(true)
    expect(getRouteMenuOpenState('/ordenes-trabajo-archivo', menuRoutes).workOrders).toBe(false)
  })
})

describe('Nav mobile drawer rendering', () => {
  const navComponent = readFileSync(resolve(process.cwd(), 'src/shared/components/Nav/Nav.tsx'), 'utf-8')
  const navStyles = readFileSync(resolve(process.cwd(), 'src/shared/components/Nav/Nav.module.css'), 'utf-8')

  it('does not apply the desktop collapsed layout inside the mobile drawer', () => {
    expect(navComponent).toContain('isCollapsedDesktop')
    expect(navComponent).toContain('isSidebarCollapsed && !isMobileDrawer')
    expect(navComponent).toContain('window.matchMedia("(max-width: 1023px)")')
  })

  it('keeps the Leonix logo text visible when the mobile drawer is open', () => {
    expect(navStyles).toMatch(/\.nav\.open\s+\.logoText\s*{[^}]*display:\s*inline-flex/s)
    expect(navStyles).toMatch(/\.nav\.open\s+\.logoText\s*{[^}]*visibility:\s*visible/s)
    expect(navStyles).toMatch(/\.nav\.open\s+\.logoText\s*{[^}]*opacity:\s*1/s)
  })
})
