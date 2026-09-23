export type MenuOpenState = {
  workOrders: boolean
  maintenance: boolean
  operation: boolean
  assets: boolean
  installations: boolean
}

type MenuRouteConfig = {
  workOrders: string[]
  maintenance: string[]
  operation: string[]
  assets: string[]
  installations: string[]
}

const isRoutePathActive = (pathname: string, route: string): boolean => {
  if (!route || route === "/") return pathname === route

  return pathname === route || pathname.startsWith(`${route}/`)
}

export const getRouteMenuOpenState = (
  pathname: string,
  routes: MenuRouteConfig
): MenuOpenState => ({
  workOrders: routes.workOrders.some((route) => isRoutePathActive(pathname, route)),
  maintenance: routes.maintenance.some((route) => isRoutePathActive(pathname, route)),
  operation: routes.operation.some((route) => isRoutePathActive(pathname, route)),
  assets: routes.assets.some((route) => isRoutePathActive(pathname, route)),
  installations: routes.installations.some((route) => isRoutePathActive(pathname, route)),
})
