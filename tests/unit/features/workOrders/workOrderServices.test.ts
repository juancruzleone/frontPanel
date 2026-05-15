import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { assignTechnicianToWorkOrder } from "../../../../src/features/workOrders/services/workOrderServices";

const fetchMock = vi.fn();

describe("workOrderServices", () => {
	beforeEach(() => {
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
});
