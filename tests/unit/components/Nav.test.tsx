import { describe, expect, it } from 'vitest'
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
