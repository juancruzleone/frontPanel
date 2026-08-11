import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./router";
import { ThemeProvider } from "./shared/hooks/useTheme";
import "./index.css";
import "../src/styles/font.css";
import "./i18n";
import { ThemedToaster, AppInitializer } from "./AppProviders";
import { installFetchCredentials } from "./shared/services/fetchCredentials";
import { useOfflineStore } from "./store/offlineStore";

const SERVICE_WORKER_URL = "/sw.js?v=4";

// Registrar Service Worker para PWA solo en builds de producción.
// En Vite dev, un SW previo puede interceptar /@vite/client y /src/main.tsx,
// dejando la app en blanco cuando el dev server no está disponible.
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		if (import.meta.env.DEV && !(window as any).IS_E2E) {
			navigator.serviceWorker
				.getRegistrations()
				.then((registrations) => {
					registrations.forEach((registration) => {
						registration.unregister();
					});
				})
				.catch(() => undefined);
			return;
		}

		const hasActiveController = Boolean(navigator.serviceWorker.controller);
		if (hasActiveController) {
			let isRefreshing = false;
			navigator.serviceWorker.addEventListener("controllerchange", () => {
				if (isRefreshing) {
					return;
				}
				isRefreshing = true;
				window.location.reload();
			});
		}

		navigator.serviceWorker
			.register(SERVICE_WORKER_URL, { updateViaCache: "none" })
			.then((registration) => registration.update())
			.catch(() => undefined);

		// Handle SYNC_TO_APP from SW → trigger encrypted coordinator sync
		navigator.serviceWorker.addEventListener("message", (event) => {
			if (event.data?.type === "SYNC_TO_APP") {
				window.dispatchEvent(new Event("online"));
			}
		});
	});
}

// Install fetch credentials before React renders (bypasses passive-effect race)
installFetchCredentials();

if (import.meta.env.DEV) {
	(window as any).useOfflineStore = useOfflineStore;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ThemeProvider>
			<ThemedToaster />
			<AppInitializer>
				<RouterProvider router={router} />
			</AppInitializer>
		</ThemeProvider>
	</React.StrictMode>,
);
