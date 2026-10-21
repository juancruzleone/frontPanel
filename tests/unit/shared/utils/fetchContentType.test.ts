import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithAuthRetry } from "../../../../src/shared/utils/apiHeaders";

// RED request: mutating calls such as PUT /ordenes-trabajo/:id and PATCH
// /ordenes-trabajo/:id/asignar send a JSON.stringify body without an explicit
// Content-Type. The backend only parses application/json, so without this
// header Express leaves the body empty and yup rejects the payload with 400.
describe("fetchWithAuthRetry content type", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		fetchMock.mockResolvedValue({
			status: 200,
			ok: true,
			json: vi.fn().mockResolvedValue({ success: true }),
		});
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	const headersOf = (call: number): Record<string, string> => {
		const [, options] = fetchMock.mock.calls[call];
		const headers = options.headers as Record<string, string>;
		const normalized: Record<string, string> = {};
		for (const [key, value] of Object.entries(headers)) {
			normalized[key.toLowerCase()] = String(value);
		}
		return normalized;
	};

	it("adds application/json when a JSON string body is sent without Content-Type", async () => {
		await fetchWithAuthRetry("/api/ordenes-trabajo/wo-1", {
			method: "PUT",
			headers: { "X-Idempotency-Key": "key-1" },
			body: JSON.stringify({ titulo: "Mantenimiento Preventivo - Mensual" }),
		});

		const headers = headersOf(0);
		expect(headers["content-type"]).toBe("application/json");
		expect(headers["x-idempotency-key"]).toBe("key-1");
	});

	it("keeps an explicitly provided Content-Type untouched", async () => {
		await fetchWithAuthRetry("/api/cuenta/tecnico", {
			method: "POST",
			headers: { "Content-Type": "application/json; charset=utf-8" },
			body: JSON.stringify({ userName: "tech" }),
		});

		expect(headersOf(0)["content-type"]).toBe("application/json; charset=utf-8");
	});

	it("does not override the multipart boundary for FormData bodies", async () => {
		const formData = new FormData();
		formData.append("userName", "tech");

		await fetchWithAuthRetry("/api/cuenta/tecnico", {
			method: "POST",
			body: formData,
		});

		expect(headersOf(0)["content-type"]).toBeUndefined();
	});

	it("sends no Content-Type for bodyless requests", async () => {
		await fetchWithAuthRetry("/api/ordenes-trabajo", { method: "GET" });

		expect(headersOf(0)["content-type"]).toBeUndefined();
	});
});
