import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useDeviceForm from "../../../../src/features/deviceForms/hooks/useDeviceForm";
import { compressImage } from "../../../../src/shared/utils/imageUtils";

const mockCompressedBlob = new Blob(["compressed"], { type: "image/jpeg" });

vi.mock("../../../../src/shared/utils/imageUtils", () => ({
	compressImage: vi.fn().mockImplementation(async () => ({
		blob: mockCompressedBlob,
		dataURL: "data:image/jpeg;base64,mockcompressed",
		filename: "photo.jpg",
	})),
	dataURLtoBlob: vi.fn().mockImplementation(
		(_dataurl: string) => new Blob(["signature"], { type: "image/png" }),
	),
}));

vi.mock("../../../../src/features/deviceForms/services/deviceFormService", () => ({
	fetchDeviceForm: vi.fn().mockResolvedValue({
		data: {
			deviceInfo: { nombre: "Test Device" },
			installationInfo: { _id: "inst-1" },
			formFields: [
				{ name: "check1", label: "Check 1", type: "checkbox", required: true },
				{ name: "ordenTrabajoId", label: "Work Order", type: "text" },
			],
		},
	}),
	submitDeviceMaintenance: vi.fn(),
}));

// Mock R8 staging
vi.mock("../../../../src/shared/offline/binaryStaging", () => ({
	stageEvidenceFromFormData: vi.fn().mockResolvedValue({
		evidenceIds: ["ev-wo1-photo-0", "ev-wo1-firma"],
		staged: 2,
		failed: 0,
	}),
}));

// Mock R7 lifecycle
vi.mock("../../../../src/shared/offline/lifecycleStart", () => ({
	resolveStartContext: vi.fn().mockResolvedValue({
		ctx: { tenantId: "t1", actorId: "a1", deviceId: "dev1", packageId: "pkg1", key: {}, kid: "k1" },
	}),
	recordMaintenanceOffline: vi.fn().mockResolvedValue({
		status: "pending_offline",
		messageKey: "offline.pendingSync",
		commandId: "maintenance-wo1-123",
	}),
	buildStartCommandId: vi.fn().mockReturnValue("start-wo1"),
	generateDraftId: vi.fn().mockReturnValue("draft-test-123"),
}));

const mockStore = {
	queue: [] as any[],
	addToQueue: vi.fn().mockImplementation((item) => { mockStore.queue.push(item); }),
	clearQueue: vi.fn().mockImplementation(() => { mockStore.queue = []; }),
};

vi.mock("../../../../src/store/offlineStore", () => ({
	useOfflineStore: Object.assign((selector: any) => selector(mockStore), {
		getState: () => mockStore,
		subscribe: vi.fn(),
	}),
}));

describe("useDeviceForm Offline R8 Evidence Staging", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(compressImage).mockResolvedValue({
			blob: mockCompressedBlob,
			dataURL: "data:image/jpeg;base64,mockcompressed",
			filename: "photo.jpg",
		});
		mockStore.clearQueue();
		vi.stubGlobal("navigator", { onLine: false });
	});

	it("stages evidence via R8 and records maintenance command when offline", async () => {
		const { stageEvidenceFromFormData } = await import("../../../../src/shared/offline/binaryStaging");
		const { recordMaintenanceOffline } = await import("../../../../src/shared/offline/lifecycleStart");

		const { result } = renderHook(() => useDeviceForm("inst-1", "dev-1"));

		await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });

		// Set work order ID in form data
		await act(async () => {
			result.current.handleChange({ target: { name: "ordenTrabajoId", value: "wo1" } } as any);
		});

		// Add photo
		const file = new File(["photo"], "photo.png", { type: "image/png" });
		await act(async () => { await result.current.handlePhotoUpload(file); });

		// Add signature
		await act(async () => { result.current.handleSignatureChange("data:image/png;base64,mockdata"); });

		// Fill required checkbox
		await act(async () => {
			result.current.handleChange({ target: { name: "check1", checked: true, type: "checkbox" } } as any);
		});

		// Submit
		await act(async () => { await result.current.handleSubmit({ preventDefault: vi.fn() } as any); });

		// R8 staging called with draftId
		expect(stageEvidenceFromFormData).toHaveBeenCalledWith(
			expect.objectContaining({ draftId: "draft-test-123", photos: expect.any(Array) }),
			expect.anything(),
			expect.anything(),
		);

		// R7 maintenance command recorded with staged evidence IDs
		expect(recordMaintenanceOffline).toHaveBeenCalledWith(
			"wo1",
			"draft-test-123",
			expect.objectContaining({ ordenTrabajoId: "wo1" }),
			["ev-wo1-photo-0", "ev-wo1-firma"],
			expect.objectContaining({ tenantId: "t1" }),
			"start-wo1",
		);

		// Legacy queue NOT used
		expect(mockStore.addToQueue).not.toHaveBeenCalled();
	});

	it("fails closed when no linked work order", async () => {
		const { result } = renderHook(() => useDeviceForm("inst-1", "dev-1"));
		await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });

		// No ordenTrabajoId set
		await act(async () => {
			result.current.handleChange({ target: { name: "check1", checked: true, type: "checkbox" } } as any);
		});
		await act(async () => { await result.current.handleSubmit({ preventDefault: vi.fn() } as any); });

		// Error set, no staging
		expect(result.current.error).toBeTruthy();
	});
});
