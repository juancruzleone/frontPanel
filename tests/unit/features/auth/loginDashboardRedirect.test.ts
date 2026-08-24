import { describe, expect, it, vi } from "vitest"
import { resolvePostLoginRoute } from "../../../../src/features/auth/hooks/useLogin"

describe("post-login dashboard redirect", () => {
  it("uses the translated Home route for every authenticated role", () => {
    const getRoute = vi.fn(() => "/accueil")
    expect(resolvePostLoginRoute(getRoute)).toBe("/accueil")
    expect(getRoute).toHaveBeenCalledWith("home")
  })
})
