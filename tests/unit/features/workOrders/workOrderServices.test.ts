import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	assignTechnicianToWorkOrder,
	exportWorkOrders,
	fetchWorkOrders,
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
		fetchWithAuthRetry: async (url: string, options: RequestInit = {}) => {
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

	it("serializes search and priority list filters", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
		});

		await fetchWorkOrders(2, 10, { search: "boiler room", prioridad: "alta" });

		const [url] = fetchMock.mock.calls[0];
		expect(String(url)).toContain("page=2");
		expect(String(url)).toContain("limit=10");
		expect(String(url)).toContain("search=boiler+room");
		expect(String(url)).toContain("prioridad=alta");
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

	it("strips empty filter values from the export CSV URL", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			blob: vi.fn().mockResolvedValue(new Blob(["csv"])),
		});
		vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:url"), revokeObjectURL: vi.fn() });
		vi.spyOn(document, "createElement").mockReturnValue({ click: vi.fn() } as unknown as HTMLAnchorElement);

		await exportWorkOrders({ estado: "", search: "bomba", prioridad: "", tecnicoId: "", timezone: "America/Argentina/Buenos_Aires", offset: 0 });

		const [url] = fetchMock.mock.calls[0];
		expect(String(url)).toContain("search=bomba");
		expect(String(url)).toContain("offset=0");
		expect(String(url)).not.toContain("estado=");
		expect(String(url)).not.toContain("prioridad=");
		expect(String(url)).not.toContain("tecnicoId=");
		expect(String(url)).not.toContain("==");
	});
});
