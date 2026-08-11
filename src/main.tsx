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
import { SERVICE_WORKER_URL } from "./shared/constants";

const reportServiceWorkerError = (error: unknown) => {
	window.dispatchEvent(new CustomEvent("serviceworker:error", { detail: error }));
};

const registerServiceWorker = async () => {
	try {
		await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
			updateViaCache: "none",
		});
		await Promise.race([
			navigator.serviceWorker.ready,
			new Promise<never>((_, reject) => {
				window.setTimeout(() => reject(new Error("Service Worker readiness timeout")), 15000);
			}),
		]);
	} catch (error) {
		reportServiceWorkerError(error);
	}
};

if ("serviceWorker" in navigator) {
	if (import.meta.env.DEV && !window.IS_E2E) {
		navigator.serviceWorker
			.getRegistrations()
			.then((registrations) => Promise.all(
				registrations.map((registration) => registration.unregister()),
			))
			.catch(reportServiceWorkerError);
	} else {
		void registerServiceWorker();
	}

	navigator.serviceWorker.addEventListener("message", (event) => {
		if (event.data?.type === "SYNC_TO_APP") {
			window.dispatchEvent(new Event("online"));
		}
	});
}

// Install fetch credentials before React renders (bypasses passive-effect race)
installFetchCredentials();

if (import.meta.env.DEV) {
	window.useOfflineStore = useOfflineStore;
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
