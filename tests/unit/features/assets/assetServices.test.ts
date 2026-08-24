import { beforeEach, describe, expect, it, vi } from "vitest"
import { commitAssetImport, downloadAssetTemplate, exportAssets, fetchAssets, fetchTemplates, previewAssetImport } from "../../../../src/features/assets/services/assetServices"

const fetchWithCsrf = vi.hoisted(() => vi.fn())
const fetchWithAuthRetry = vi.hoisted(() => vi.fn())
vi.mock("../../../../src/shared/utils/apiHeaders", () => ({
  getAuthHeaders: vi.fn(() => ({ Authorization: "Bearer token" })), getHeadersWithContentType: vi.fn(() => ({})),
  fetchWithAuthRetry, fetchWithCsrf,
}))

describe("asset CSV service", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", vi.fn()) })

  it("sends cookies and real filters when fetching assets", async () => {
    fetchWithAuthRetry.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ assets: [], total: 0, totalPages: 1 }) })
    await fetchAssets({ page: 2, limit: 4, search: "pump", category: "Equipment" })
    expect(fetchWithAuthRetry).toHaveBeenCalledWith(expect.stringMatching(/activos\?.*page=2.*limit=4.*search=pump.*category=Equipment/), expect.objectContaining({ credentials: "include" }))
  })

  it("sends cookies when fetching templates", async () => {
    fetchWithAuthRetry.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ success: true, data: [] }) })
    await fetchTemplates({ page: 1, limit: 100 })
    expect(fetchWithAuthRetry).toHaveBeenCalledWith(expect.stringContaining("plantillas?"), expect.objectContaining({ credentials: "include" }))
  })

  it("previews multipart CSV through CSRF", async () => {
    fetchWithCsrf.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ token: "t" }) })
    await previewAssetImport(new File(["csv"], "assets.csv", { type: "text/csv" }))
    expect(fetchWithCsrf).toHaveBeenCalledWith(expect.stringContaining("activos/csv/import/preview"), expect.objectContaining({ method: "POST", body: expect.any(FormData) }))
  })

  it("commits with preview hash and idempotency key", async () => {
    fetchWithCsrf.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ create: 1 }) })
    const preview = { token: "token", payloadHash: "hash" } as any
    await commitAssetImport(preview)
    expect(fetchWithCsrf).toHaveBeenCalledWith(expect.stringContaining("activos/csv/import/commit"), expect.objectContaining({ headers: expect.objectContaining({ "Idempotency-Key": "token" }), body: JSON.stringify({ token: "token", payloadHash: "hash" }) }))
  })

  it("sends the real Assets filters to export through the auth-retry wrapper", async () => {
    fetchWithAuthRetry.mockResolvedValue({ ok: true, blob: vi.fn().mockResolvedValue(new Blob()) } as any)
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:url"), revokeObjectURL: vi.fn() })
    vi.spyOn(document, "createElement").mockReturnValue({ click: vi.fn(), set href(_value: string) {}, set download(_value: string) {} } as any)
    await exportAssets({ search: "pump", category: "Pumps" })
    expect(fetchWithAuthRetry).toHaveBeenCalledWith(expect.stringContaining("search=pump&category=Pumps"), expect.any(Object))
    expect(fetch).not.toHaveBeenCalled()
  })

  it("downloads the template through the auth-retry wrapper", async () => {
    fetchWithAuthRetry.mockResolvedValue({ ok: true, blob: vi.fn().mockResolvedValue(new Blob()) } as any)
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:url"), revokeObjectURL: vi.fn() })
    vi.spyOn(document, "createElement").mockReturnValue({ click: vi.fn(), set href(_value: string) {}, set download(_value: string) {} } as any)

    await downloadAssetTemplate()

    expect(fetchWithAuthRetry).toHaveBeenCalledWith(expect.stringContaining("activos/csv/template"), expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token" }) }))
    expect(fetch).not.toHaveBeenCalled()
  })
})
