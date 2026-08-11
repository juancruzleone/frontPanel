import { expect, test } from "@playwright/test";

test("loads a declared deep route in a new page after online preparation", async ({ page, context }) => {
	test.setTimeout(60000);
	const browserErrors: string[] = [];
	page.on("pageerror", (error) => browserErrors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") browserErrors.push(message.text());
	});
	page.on("requestfailed", (request) => {
		browserErrors.push(`${request.url()}: ${request.failure()?.errorText ?? "request failed"}`);
	});

	await page.addInitScript(() => {
		window.IS_E2E = true;
	});
	await page.route("**/api/**", (route) => route.fulfill({
		status: 503,
		contentType: "application/json",
		body: JSON.stringify({ message: "API unavailable in app-shell test" }),
	}));

	await page.goto("/");
	await page.waitForFunction(async () => {
		const registration = await navigator.serviceWorker.ready;
		return Boolean(
			navigator.serviceWorker.controller &&
			registration.active?.state === "activated" &&
			!registration.installing &&
			!registration.waiting
		);
	}, { timeout: 30000 });

	await expect(page.locator("#root"), browserErrors.join("\n")).not.toBeEmpty();
	const documentAssets = await page.evaluate(() => [
		...Array.from(document.scripts, (script) => script.src),
		...Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'), (link) => link.href),
	].filter(Boolean).map((asset) => new URL(asset).pathname));
	await expect.poll(async () => page.evaluate(async (assets) => {
		const metadata = await caches.open("leonix-shell-v6-metadata");
		const pointer = await metadata.match("/__leonix_active_generation__");
		if (!pointer) return assets;
		const cache = await caches.open(await pointer.text());
		const cachedUrls = (await cache.keys()).map((request) => new URL(request.url).pathname);
		return assets.filter((asset) => !cachedUrls.includes(asset));
	}, documentAssets), { timeout: 30000 }).toEqual([]);

	await page.close();
	await context.setOffline(true);

	const offlinePage = await context.newPage();
	offlinePage.on("pageerror", (error) => browserErrors.push(error.message));
	offlinePage.on("requestfailed", (request) => {
		if (!request.url().includes("/api/")) {
			browserErrors.push(`${request.url()}: ${request.failure()?.errorText ?? "request failed"}`);
		}
	});
	const deepRoute = "/dispositivo/offline-installation/offline-device";
	const navigation = await offlinePage.goto(deepRoute, { waitUntil: "domcontentloaded" });
	expect(navigation?.status()).toBe(200);
	await expect(offlinePage).toHaveURL(new RegExp(`${deepRoute}$`));
	await expect(offlinePage.getByRole("heading", { level: 2, name: "Error" }), browserErrors.join("\n")).toBeVisible();
	await expect(offlinePage.getByText("No se pudo cargar la información del dispositivo")).toBeVisible();

	await offlinePage.reload({ waitUntil: "domcontentloaded" });
	await expect(offlinePage.getByRole("heading", { level: 2, name: "Error" })).toBeVisible();
});
