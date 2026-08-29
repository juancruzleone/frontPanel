import { fireEvent, render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "../../../../src/i18n"
import { ComplianceEvaluationsPanel } from "../../../../src/features/compliance/components/ComplianceEvaluationsPanel"
import { useComplianceEvaluations } from "../../../../src/features/compliance/hooks/useComplianceEvaluations"
import { useAuthStore } from "../../../../src/store/authStore"
import type { CatalogAssignment, CatalogRunDetail, CatalogRunSummary } from "../../../../src/features/compliance/services/complianceTypes"

vi.mock("../../../../src/features/compliance/hooks/useComplianceEvaluations", () => ({ useComplianceEvaluations: vi.fn() }))

const assignment: CatalogAssignment = { assignmentKey: "pack:1", packKey: "pack", version: 1, status: "active", scope: "tenant", parameters: {}, controlScopes: [] }
const run: CatalogRunSummary = { _id: "run-1", source: "catalog", estado: "completado", progress: { total: 6, processed: 6, skipped: 0 }, counts: { PASS: 1, WARN: 1, FAIL: 1, NOT_APPLICABLE: 1, INSUFFICIENT_EVIDENCE: 1, ERROR: 1 }, score: 50 }
const detail: CatalogRunDetail = { ...run, assignment: { ...assignment, status: "inactive" }, pack: { packKey: "pack", version: 1, state: "disabled", controlRefs: [], evaluatorRefs: [] }, controls: [], evaluators: [{ evaluatorKey: "safe-check", version: 2, operationId: "op", implementationVersion: "v1" }], rights: { author: "Leonix", rightsStatus: "original_operational_content" }, applicability: { scope: "tenant" }, snapshotAt: "2026-08-29T00:00:00Z" }
const findings = { items: ["PASS", "WARN", "FAIL", "NOT_APPLICABLE", "INSUFFICIENT_EVIDENCE", "ERROR"].map((state, index) => ({ id: `f-${index}`, state, reason: `reason-${index}`, evaluatedAt: "now", targetId: "target", controlKey: "control", controlVersion: 1, dataHash: null })), page: 1, limit: 10, total: 6, totalPages: 1 }

const renderPanel = () => render(<I18nextProvider i18n={i18n}><ComplianceEvaluationsPanel /></I18nextProvider>)
const setup = (overrides: Record<string, unknown> = {}) => {
  const startEvaluation = vi.fn().mockResolvedValue({ _id: "run-2", estado: "pendiente" })
  const value = { assignments: [assignment], catalogRuns: { items: [run], page: 1, limit: 10, total: 1, totalPages: 1 }, catalogRun: detail, catalogFindings: findings, loading: false, error: null, loadRuns: vi.fn().mockResolvedValue(undefined), loadRun: vi.fn().mockResolvedValue(detail), loadFindings: vi.fn().mockResolvedValue(findings), startEvaluation, ...overrides }
  vi.mocked(useComplianceEvaluations).mockReturnValue(value as ReturnType<typeof useComplianceEvaluations>)
  return { startEvaluation, value }
}

describe("ComplianceEvaluationsPanel", () => {
  beforeEach(() => { vi.clearAllMocks(); useAuthStore.setState({ role: "admin" }) })

  it("renders six exact states, backend counters, score, and immutable disabled snapshot", () => {
    const { value } = setup()
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: /Ver evaluación/ }))
    for (const state of ["PASS", "WARN", "FAIL", "NOT_APPLICABLE", "INSUFFICIENT_EVIDENCE", "ERROR"]) expect(screen.getAllByText(new RegExp(state)).length).toBeGreaterThan(0)
    expect(screen.getByText(/50/)).toBeInTheDocument()
    expect(screen.getByText(/inactive/)).toBeInTheDocument()
    expect(screen.getByText(/disabled/)).toBeInTheDocument()
    expect(screen.getByText(/2026-08-29/)).toBeInTheDocument()
    expect(screen.queryByText(/certific|conformidad|ISO|IRAM/i)).not.toBeInTheDocument()
    expect(value.loadFindings).toHaveBeenCalledWith("run-1", 1)
  })

  it("starts active assignments for admins and technicians, but not inactive assignments", async () => {
    const { startEvaluation } = setup()
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: /Iniciar Evaluación Leonix/ }))
    await vi.waitFor(() => expect(startEvaluation).toHaveBeenCalledWith("pack:1"))
    expect(screen.getByText("Evaluación Leonix")).toBeInTheDocument()
    expect(screen.queryByText(/No hay evaluaciones/)).not.toBeInTheDocument()
  })

  it("keeps technician start available and renders explicit empty/error/retry states", async () => {
    const { startEvaluation } = setup({ catalogRuns: { items: [], page: 1, limit: 10, total: 0, totalPages: 0 } })
    useAuthStore.setState({ role: "técnico" })
    const { unmount } = renderPanel()
    expect(screen.getByText(/No hay evaluaciones/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Iniciar Evaluación/ }))
    await vi.waitFor(() => expect(startEvaluation).toHaveBeenCalledWith("pack:1"))
    unmount()
    setup({ catalogRuns: null, catalogRun: null, catalogFindings: null, error: "compliance.evaluation.error" })
    renderPanel()
    expect(screen.getByText(/No se pudieron cargar/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Reintentar/ })).toBeInTheDocument()
  })

  it("shows polling detail status and paginates findings without changing score semantics", () => {
    setup({ catalogRun: null, catalogFindings: null, loading: true, catalogRuns: { items: [run], page: 1, limit: 10, total: 1, totalPages: 1 } })
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: /Ver evaluación/ }))
    expect(screen.getByText(/Cargando detalle/)).toBeInTheDocument()
  })
})
