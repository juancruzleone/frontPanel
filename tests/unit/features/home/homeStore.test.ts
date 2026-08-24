import { describe, expect, it } from "vitest"
import { buildHomeCacheKey, HOME_SCOPE_VERSION } from "../../../../src/store/homeStore"

describe("home cache identity", () => {
  it("isolates data by tenant, user, role, and scope version", () => {
    expect(buildHomeCacheKey("tenant-a", "user-1", "admin")).toBe(`tenant-a:user-1:admin:${HOME_SCOPE_VERSION}`)
    expect(buildHomeCacheKey("tenant-b", "user-1", "admin")).not.toBe(buildHomeCacheKey("tenant-a", "user-1", "admin"))
    expect(buildHomeCacheKey("tenant-a", "user-1", "cliente")).not.toBe(buildHomeCacheKey("tenant-a", "user-1", "admin"))
  })

  it("fails closed when identity is incomplete", () => {
    expect(buildHomeCacheKey(null, "user-1", "admin")).toBeNull()
    expect(buildHomeCacheKey("tenant-a", null, "admin")).toBeNull()
  })
})
