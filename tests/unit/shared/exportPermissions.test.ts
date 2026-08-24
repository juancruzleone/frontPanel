import { describe, expect, it } from "vitest"
import { canDownloadCsvTemplate, canExportCsv, canExportOperationalResults } from "../../../src/shared/utils/exportPermissions"

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

describe("canExportCsv (backend isAdminOrTechnician parity)", () => {
  it("matches the backend export middleware role set", () => {
    expect(canExportCsv("admin")).toBe(true)
    expect(canExportCsv("super_admin")).toBe(true)
    expect(canExportCsv("tecnico")).toBe(true)
    expect(canExportCsv("técnico")).toBe(true)
    expect(canExportCsv("ADMIN")).toBe(true)
    expect(canExportCsv(" Técnico ")).toBe(true)
  })

  it("rejects clients, unknown roles and missing role", () => {
    expect(canExportCsv("cliente")).toBe(false)
    expect(canExportCsv("supervisor")).toBe(false)
    expect(canExportCsv(undefined)).toBe(false)
    expect(canExportCsv(null)).toBe(false)
    expect(canExportCsv("")).toBe(false)
  })
})

describe("canDownloadCsvTemplate (backend isAdmin parity)", () => {
  it("allows admins only, including super_admin", () => {
    expect(canDownloadCsvTemplate("admin")).toBe(true)
    expect(canDownloadCsvTemplate("super_admin")).toBe(true)
  })

  it("rejects technicians, clients and missing role", () => {
    expect(canDownloadCsvTemplate("tecnico")).toBe(false)
    expect(canDownloadCsvTemplate("técnico")).toBe(false)
    expect(canDownloadCsvTemplate("cliente")).toBe(false)
    expect(canDownloadCsvTemplate(null)).toBe(false)
  })
})
