import { render, screen, waitFor } from "@testing-library/react"
import { isValidElement, Suspense, type ReactElement, type RouteObject } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ProtectedRoute from "../../../../src/router/ProtectedRoute"
import RedirectIfLogged from "../../../../src/router/RedirectIfLoggedIn"
import RoleProtectedRoute from "../../../../src/router/RoleProtectedRoute"
import { BillingRoute } from "../../../../src/router/BillingRoute"
import { routeTranslations } from "../../../../src/router/routeTranslations"
import { createTranslatedRouter } from "../../../../src/router/createTranslatedRouter"
import { OAUTH_CALLBACK_PATH } from "../../../../src/features/auth/services/oauthServices"
import { useAuthStore } from "../../../../src/store/authStore"
import "../../../../src/i18n"

// backPanel redirects the browser to /auth/callback with a session cookie that
// has not been verified yet. If any guard ran first, the visit would be bounced
// to login (or worse, treated as an authenticated home visit) before the cookie
// was ever checked, and the localized-route rewrite would rewrite the hand-off
// URL. So the callback route has to be a bare, single, unlocalized route.

vi.mock("../../../../src/pages/OAuthCallback", () => ({
  default: () => <p>oauth-callback-page</p>,
}))

const GUARDS = [ProtectedRoute, RedirectIfLogged, RoleProtectedRoute, BillingRoute]

interface RouteNode {
  path?: string
  element?: unknown
  children?: RouteNode[]
  loader?: unknown
  action?: unknown
}

const collectCallbackRoutes = (nodes: RouteNode[]): RouteNode[] => {
  const found: RouteNode[] = []

  const walk = (list: RouteNode[]): void => {
    for (const node of list) {
      if (node.path === OAUTH_CALLBACK_PATH) found.push(node)
      if (node.children) walk(node.children)
    }
  }

  walk(nodes)
  return found
}

const routesOf = (): RouteNode[] => {
  const router = createTranslatedRouter()
  // SAFETY: react-router keeps the authored RouteObject tree on the router it
  // builds; the aggregated union type is a router-internal detail.
  return router.routes as RouteNode[]
}

const renderAt = (pathname: string) => {
  // SAFETY: the router exposes the exact RouteObject tree this app authored.
  const memoryRouter = createMemoryRouter(routesOf() as RouteObject[], { initialEntries: [pathname] })

  return {
    memoryRouter,
    ...render(
      <Suspense fallback={<p>route-loading</p>}>
        <RouterProvider router={memoryRouter} />
      </Suspense>,
    ),
  }
}

beforeEach(async () => {
  await useAuthStore.getState().logout()
  localStorage.clear()
  sessionStorage.clear()
})

describe("oauth callback route", () => {
  it("registers exactly one unlocalized callback route at the top level", () => {
    const all = routesOf()
    const nested = collectCallbackRoutes(all)
    const topLevel = all.filter((node) => node.path === OAUTH_CALLBACK_PATH)

    expect(nested).toHaveLength(1)
    expect(topLevel).toHaveLength(1)

    const localized = Object.values(routeTranslations)
      .map((translations) => Object.values(translations).filter((segment) => segment.includes("auth")))
      .flat()
    expect(localized).toEqual([])
  })

  it("wraps the callback page in no guard, loader, or action", () => {
    const [callback] = collectCallbackRoutes(routesOf())

    expect(callback).toBeTruthy()
    expect(callback.children).toBeUndefined()
    expect(callback.loader).toBeUndefined()
    expect(callback.action).toBeUndefined()
    expect(isValidElement(callback.element)).toBe(true)

    const element = callback.element as ReactElement<{ children?: unknown }>
    for (const guard of GUARDS) {
      expect(element.type).not.toBe(guard)
    }
  })

  it("renders the callback page for an anonymous visitor with unresolved auth", async () => {
    useAuthStore.setState({ isAuthenticated: false, isAuthResolved: false, accessMode: "anonymous" })

    renderAt(OAUTH_CALLBACK_PATH)

    await waitFor(() => expect(screen.getByText("oauth-callback-page")).toBeInTheDocument())
    expect(screen.queryByText("route-loading")).not.toBeInTheDocument()
  })

  it("renders the callback page even when a stale session looks authenticated", async () => {
    useAuthStore.setState({
      user: "tecnico",
      userId: "user-1",
      role: "tecnico",
      isAuthenticated: true,
      isAuthResolved: true,
      accessMode: "full",
    })

    renderAt(OAUTH_CALLBACK_PATH)

    await waitFor(() => expect(screen.getByText("oauth-callback-page")).toBeInTheDocument())
  })

  it("keeps the guards on the localized app routes it must still protect", async () => {
    useAuthStore.setState({ isAuthenticated: false, isAuthResolved: true, accessMode: "anonymous" })

    const { memoryRouter } = renderAt(`/${routeTranslations.es.home}`)

    await waitFor(() => expect(memoryRouter.state.location.pathname).toBe("/"))
    expect(screen.queryByText("oauth-callback-page")).not.toBeInTheDocument()
  })
})
