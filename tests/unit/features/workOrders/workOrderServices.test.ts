import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	assignTechnicianToWorkOrder,
	updateWorkOrder,
} from "../../../../src/features/workOrders/services/workOrderServices";

// Mock fetchWithCsrf to behave like a plain fetch (no CSRF retry logic)
// so tests stay deterministic without CSRF store / token management
vi.mock("../../../../src/shared/utils/apiHeaders", async () => {
	const actual = await vi.importActual<
		typeof import("../../../../src/shared/utils/apiHeaders")
	>("../../../../src/shared/utils/apiHeaders");
	return {
		...actual,
		fetchWithCsrf: async (url: string, options: RequestInit = {}) => {
			return fetch(url, { ...options, credentials: "include" });
		},
	};
});

const fetchMock = vi.fn();

describe("workOrderServices", () => {
	beforeEach(() => {
		// @ts-expect-error - Setting import.meta.env for deterministic API URL
		import.meta.env.VITE_API_URL = "/api/";

		fetchMock.mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({ success: true, message: "Asignada" }),
		});
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it("sends canonical tecnicoIds when assigning multiple technicians", async () => {
		await assignTechnicianToWorkOrder("wo-1", ["tech-1", "tech-2", "tech-2"]);

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/ordenes-trabajo/wo-1/asignar",
			expect.objectContaining({ method: "PATCH" }),
		);

		const [, options] = fetchMock.mock.calls[0];
		expect(JSON.parse(options.body)).toEqual({
			tecnicoId: "tech-1",
			tecnicoIds: ["tech-1", "tech-2"],
		});
	});

	it("formats object error payloads without rendering object Object", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			status: 403,
			statusText: "Forbidden",
			json: vi.fn().mockResolvedValue({
				message: { text: "No autorizado" },
				details: [{ path: "estado", message: "Transición no permitida" }],
			}),
		});

		await expect(
			updateWorkOrder("wo-1", {
				titulo: "Orden",
				descripcion: "Descripción de prueba",
				instalacionId: "inst-1",
				estado: "pendiente",
				prioridad: "media",
				tipoTrabajo: "mantenimiento",
				fechaProgramada: "2026-05-01",
				horaProgramada: "10:00",
			}),
		).rejects.toThrow("No autorizado: Transición no permitida - estado");
	});
});
