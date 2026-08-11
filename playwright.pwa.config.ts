import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "offline-app-shell.spec.ts",
	timeout: 60000,
	expect: {
		timeout: 10000,
	},
	projects: [
		{
			name: "pwa-preview",
			use: {
				baseURL: "http://127.0.0.1:4174",
				trace: "on-first-retry",
				screenshot: "only-on-failure",
			},
		},
	],
	webServer: {
		command: "bunx vite preview --host 127.0.0.1 --port 4174",
		url: "http://127.0.0.1:4174",
		reuseExistingServer: false,
		timeout: 120000,
	},
});
