import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { compressImage } from "../../../../src/shared/utils/imageUtils";

describe("compressImage", () => {
	let originalCreateElement: typeof document.createElement;
	let lastCanvas: {
		width: number;
		height: number;
		toDataURL: ReturnType<typeof vi.fn>;
	} | null;
	let mockImage: {
		width: number;
		height: number;
		onload: (() => void) | null;
		onerror: (() => void) | null;
		src: string;
	};

	const createFileReaderMock = (shouldFail = false) => {
		function FileReaderMock(this: {
			onload?: (event: { target: { result: string } }) => void;
			onerror?: () => void;
			result?: string;
		}) {
			this.onload = undefined;
			this.onerror = undefined;
		}
		FileReaderMock.prototype.readAsDataURL = function () {
			setTimeout(() => {
				if (shouldFail) {
					if (this.onerror) this.onerror();
					return;
				}
				this.result = "data:image/png;base64,mockdata";
				if (this.onload) this.onload({ target: { result: this.result } });
			}, 0);
		};
		return FileReaderMock;
	};

	beforeEach(() => {
		mockImage = {
			width: 2000,
			height: 1000,
			onload: null,
			onerror: null,
			src: "",
		};

		function ImageMock(this: any) {
			Object.defineProperty(this, "onload", {
				get: () => mockImage.onload,
				set: (handler) => {
					mockImage.onload = handler;
				},
			});
			Object.defineProperty(this, "onerror", {
				get: () => mockImage.onerror,
				set: (handler) => {
					mockImage.onerror = handler;
				},
			});
			Object.defineProperty(this, "src", {
				get: () => mockImage.src,
				set: (value: string) => {
					mockImage.src = value;
					setTimeout(() => {
						if (mockImage.onload) mockImage.onload();
					}, 0);
				},
			});
			this.width = mockImage.width;
			this.height = mockImage.height;
		}

		vi.stubGlobal("Image", ImageMock);
		vi.stubGlobal("FileReader", createFileReaderMock(false));

		originalCreateElement = document.createElement;
		document.createElement = vi.fn((tagName: string) => {
			if (tagName === "canvas") {
				lastCanvas = null;
				const canvas = {
					width: 0,
					height: 0,
					getContext: () => ({
						drawImage: vi.fn(),
					}),
					toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,mockdata"),
				};
				lastCanvas = canvas;
				return canvas as unknown as HTMLElement;
			}
			return originalCreateElement.call(document, tagName);
		}) as typeof document.createElement;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		document.createElement = originalCreateElement;
	});

	it("should downscale an oversized image while preserving aspect ratio", async () => {
		const file = new File(["content"], "photo.png", { type: "image/png" });
		const result = await compressImage(file, {
			maxWidth: 1280,
			maxHeight: 1280,
		});

		expect(result.blob).toBeInstanceOf(Blob);
		expect(result.dataURL).toBe("data:image/jpeg;base64,mockdata");
		expect(result.filename).toBe("photo.jpg");
	});

	it("should not upscale a small image", async () => {
		mockImage.width = 600;
		mockImage.height = 400;

		const file = new File(["content"], "small.png", { type: "image/png" });
		await compressImage(file);

		expect(lastCanvas).not.toBeNull();
		expect(lastCanvas!.width).toBe(600);
		expect(lastCanvas!.height).toBe(400);
	});

	it("should use the provided quality parameter", async () => {
		const file = new File(["content"], "photo.png", { type: "image/png" });
		await compressImage(file, { quality: 0.9 });

		expect(lastCanvas!.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.9);
	});

	it("should use default quality when not provided", async () => {
		const file = new File(["content"], "photo.png", { type: "image/png" });
		await compressImage(file);

		expect(lastCanvas!.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.7);
	});

	it("should reject when FileReader fails", async () => {
		vi.stubGlobal("FileReader", createFileReaderMock(true));

		const badFile = new File([], "empty.png", { type: "image/png" });
		await expect(compressImage(badFile)).rejects.toThrow(
			"No se pudo leer la imagen",
		);
	});

	it("should reject when Image fails to load", async () => {
		let errorHandler: (() => void) | null = null;
		function FailingImageMock(this: any) {
			Object.defineProperty(this, "onerror", {
				get: () => errorHandler,
				set: (handler) => {
					errorHandler = handler;
				},
			});
			Object.defineProperty(this, "src", {
				set: () => {
					setTimeout(() => {
						if (errorHandler) errorHandler();
					}, 0);
				},
			});
		}
		vi.stubGlobal("Image", FailingImageMock);

		const file = new File(["content"], "photo.png", { type: "image/png" });
		await expect(compressImage(file)).rejects.toThrow(
			"No se pudo cargar la imagen",
		);
	});

	it("should reject when canvas context is unavailable", async () => {
		document.createElement = vi.fn((tagName: string) => {
			if (tagName === "canvas") {
				return {
					getContext: () => null,
				} as unknown as HTMLElement;
			}
			return originalCreateElement.call(document, tagName);
		}) as typeof document.createElement;

		const file = new File(["content"], "photo.png", { type: "image/png" });
		await expect(compressImage(file)).rejects.toThrow("Canvas no disponible");
	});
});
