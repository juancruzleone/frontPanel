import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useDeviceForm from "../../../../src/features/deviceForms/hooks/useDeviceForm";
import { offlineBinaryStorage } from "../../../../src/shared/services/offlineBinaryStorage";
import { compressImage } from "../../../../src/shared/utils/imageUtils";

const mockCompressedBlob = new Blob(["compressed"], { type: "image/jpeg" });

vi.mock("../../../../src/shared/utils/imageUtils", () => ({
	compressImage: vi.fn().mockImplementation(async () => ({
		blob: mockCompressedBlob,
		dataURL: "data:image/jpeg;base64,mockcompressed",
		filename: "photo.jpg",
	})),
	dataURLtoBlob: vi
		.fn()
		.mockImplementation(
			(_dataurl: string) => new Blob(["signature"], { type: "image/png" }),
		),
}));

vi.mock(
	"../../../../src/features/deviceForms/services/deviceFormService",
	() => ({
		fetchDeviceForm: vi.fn().mockResolvedValue({
			data: {
				deviceInfo: { nombre: "Test Device" },
				installationInfo: { _id: "inst-1" },
				formFields: [
					{
						name: "check1",
						label: "Check 1",
						type: "checkbox",
						required: true,
					},
				],
			},
		}),
		submitDeviceMaintenance: vi.fn(),
	}),
);

vi.mock("../../../../src/shared/services/offlineBinaryStorage", () => ({
	offlineBinaryStorage: {
		saveBinary: vi.fn().mockResolvedValue("mock-binary-id"),
		getBinary: vi.fn(),
		removeBinary: vi.fn(),
	},
}));

// We need a real-ish store for this test
const mockStore = {
	queue: [] as any[],
	addToQueue: vi.fn().mockImplementation((item) => {
		mockStore.queue.push(item);
	}),
	clearQueue: vi.fn().mockImplementation(() => {
		mockStore.queue = [];
	}),
};

vi.mock("../../../../src/store/offlineStore", () => ({
	useOfflineStore: Object.assign((selector: any) => selector(mockStore), {
		getState: () => mockStore,
		subscribe: vi.fn(),
	}),
}));

describe("useDeviceForm Offline Binary Staging", () => {
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

	it("should stage photos in IndexedDB and add to queue with refs when offline", async () => {
		const { result } = renderHook(() => useDeviceForm("inst-1", "dev-1"));

		// Wait for form to load
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
		});

		// 1. Add a photo
		const file = new File(["photo"], "photo.png", { type: "image/png" });
		await act(async () => {
			await result.current.handlePhotoUpload(file);
		});

		// 2. Add signature
		await act(async () => {
			result.current.handleSignatureChange("data:image/png;base64,mockdata");
		});

		// 3. Fill required fields
		await act(async () => {
			result.current.handleChange({
				target: { name: "check1", checked: true, type: "checkbox" },
			} as any);
		});

		// 4. Submit offline
		await act(async () => {
			await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
		});

		// Expectations
		expect(offlineBinaryStorage.saveBinary).toHaveBeenCalledTimes(2); // 1 photo + 1 signature
		expect(mockStore.addToQueue).toHaveBeenCalled();

		const queuedItem = mockStore.queue[0];
		expect(queuedItem.type).toBe("DEVICE_MAINTENANCE");
		expect(queuedItem.binaryRefs).toHaveLength(2);
		expect(queuedItem.binaryRefs[0]).toMatchObject({
			id: "mock-binary-id",
			filename: "photo.jpg",
			field: "fotosEvidencia[0]",
		});
		expect(queuedItem.binaryRefs[1]).toMatchObject({
			id: "mock-binary-id",
			filename: "firma.png",
			field: "firmaTecnico",
		});

		// Payload should NOT contain base64
		expect(queuedItem.payload.fotosEvidencia).toBeUndefined(); // or empty as per implementation
		expect(queuedItem.payload.firmaTecnico).toBeUndefined();
	});

	it("should preserve selection order across concurrent photo uploads", async () => {
		let resolveFirst: ((value: Awaited<ReturnType<typeof compressImage>>) => void) | undefined;
		const firstCompression = new Promise<Awaited<ReturnType<typeof compressImage>>>((resolve) => {
			resolveFirst = resolve;
		});

		vi.mocked(compressImage)
			.mockImplementationOnce(() => firstCompression)
			.mockResolvedValueOnce({
				blob: new Blob(["second"], { type: "image/jpeg" }),
				dataURL: "data:image/jpeg;base64,second",
				filename: "second.jpg",
			});

		const { result } = renderHook(() => useDeviceForm("inst-1", "dev-1"));
		const firstFile = new File(["first"], "first.png", { type: "image/png" });
		const secondFile = new File(["second"], "second.png", { type: "image/png" });

		let firstUpload: Promise<boolean>;
		let secondUpload: Promise<boolean>;
		await act(async () => {
			firstUpload = result.current.handlePhotoUpload(firstFile);
			secondUpload = result.current.handlePhotoUpload(secondFile);
			await Promise.resolve();
		});

		expect(compressImage).toHaveBeenCalledTimes(1);

		await act(async () => {
			resolveFirst?.({
				blob: new Blob(["first"], { type: "image/jpeg" }),
				dataURL: "data:image/jpeg;base64,first",
				filename: "first.jpg",
			});
			await Promise.all([firstUpload!, secondUpload!]);
		});

		expect(result.current.fotosEvidencia).toEqual([
			"data:image/jpeg;base64,first",
			"data:image/jpeg;base64,second",
		]);
	});

	it("should report compression failures and clear the error after retry", async () => {
		vi.mocked(compressImage).mockRejectedValueOnce(new Error("decode failed"));
		const { result } = renderHook(() => useDeviceForm("inst-1", "dev-1"));
		const file = new File(["photo"], "photo.png", { type: "image/png" });

		await act(async () => {
			expect(await result.current.handlePhotoUpload(file)).toBe(false);
		});
		expect(result.current.error).toBe("decode failed");

		await act(async () => {
			expect(await result.current.handlePhotoUpload(file)).toBe(true);
		});
		expect(result.current.error).toBeNull();
	});
});
