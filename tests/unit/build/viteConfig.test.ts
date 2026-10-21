import { describe, expect, it, vi } from "vitest";
import type { UserConfigExport } from "vite";

// Evaluate the public configuration without loading local environment files.
vi.mock("vite", () => ({
	defineConfig: (config: UserConfigExport) => config,
	loadEnv: () => ({}),
}));
vi.mock("@vitejs/plugin-react", () => ({ default: () => ({ name: "react" }) }));

import viteConfig from "../../../vite.config";

describe("production bundle configuration", () => {
	it("keeps translation initialization and resources in a separate shared chunk", async () => {
		const config = await (typeof viteConfig === "function"
			? viteConfig({ command: "build", mode: "production" })
			: viteConfig);
		const output = config.build?.rolldownOptions?.output;
		if (!output || Array.isArray(output)) throw new Error("Expected one bundle output");
		const splitting = output.codeSplitting;
		if (!splitting || typeof splitting !== "object") throw new Error("Expected explicit chunk groups");
		const translations = splitting.groups?.find((group) => group.name === "i18n");
		const matcher = translations?.test;
		if (!(matcher instanceof RegExp)) throw new Error("Expected a translation module matcher");

		expect("/app/src/i18n/index.ts").toMatch(matcher);
		expect("/app/src/i18n/locales/es.json").toMatch(matcher);
		expect("/app/src/i18n/locales/en.json").toMatch(matcher);
		expect("/app/src/main.tsx").not.toMatch(matcher);
		expect("/app/src/pages/Home.tsx").not.toMatch(matcher);
		expect("/app/node_modules/i18next/index.js").not.toMatch(matcher);
		// Let Rolldown include dependencies to avoid circular initialization chunks.
		expect(translations?.includeDependenciesRecursively).not.toBe(false);
		expect(output.entryFileNames).toBe("assets/js/[name]-[hash].js");
		expect(output.chunkFileNames).toBe("assets/js/[name]-[hash].js");
		expect(config.build?.minify).toBe("esbuild");
		expect(config.build?.manifest).toBe("asset-manifest.json");
	});
});
