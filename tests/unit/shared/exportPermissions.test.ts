import { describe, expect, it } from "vitest"
import { canExportOperationalResults } from "../../../src/shared/utils/exportPermissions"

describe("operational export roles", () => {
  it("allows current admin and technician readers", () => {
    expect(canExportOperationalResults("admin")).toBe(true)
    expect(canExportOperationalResults("super_admin")).toBe(true)
    expect(canExportOperationalResults("tecnico")).toBe(true)
    expect(canExportOperationalResults("técnico")).toBe(true)
  })

  it("rejects clients and missing roles", () => {
    expect(canExportOperationalResults("cliente")).toBe(false)
    expect(canExportOperationalResults("client")).toBe(false)
    expect(canExportOperationalResults(null)).toBe(false)
  })
})
