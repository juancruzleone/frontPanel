import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchWithCsrf } from "../../../../src/shared/utils/apiHeaders"
import { uploadBinary } from "../../../../src/shared/services/uploadService"

vi.mock("../../../../src/shared/utils/apiHeaders", () => ({
  fetchWithCsrf: vi.fn(),
}))

describe("uploadBinary", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sends the staged binary ID and returns the backend URL", async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue(new Response(JSON.stringify({
      url: "https://storage.test/tenant/user/evidence.png",
      idempotent: false,
    }), { status: 201, headers: { "Content-Type": "application/json" } }))
    const blob = new Blob(["image"], { type: "image/png" })

    const url = await uploadBinary(blob, "evidence.png", "binary-123")

    expect(url).toBe("https://storage.test/tenant/user/evidence.png")
    expect(fetchWithCsrf).toHaveBeenCalledWith(expect.stringMatching(/\/api\/uploads\/binary$/), {
      method: "POST",
      body: expect.any(FormData),
    })
    const form = vi.mocked(fetchWithCsrf).mock.calls[0][1]?.body as FormData
    expect(form.get("binaryId")).toBe("binary-123")
    expect((form.get("file") as File).name).toBe("evidence.png")
  })

  it("surfaces the backend structured error", async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue(new Response(JSON.stringify({
      error: { code: "FILE_SIGNATURE_MISMATCH", message: "Firma inválida" },
    }), { status: 415, headers: { "Content-Type": "application/json" } }))

    await expect(uploadBinary(new Blob(["bad"]), "bad.png", "binary-123"))
      .rejects.toThrow("Firma inválida")
  })
})
