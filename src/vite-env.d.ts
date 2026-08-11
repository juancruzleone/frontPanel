/// <reference types="vite/client" />

interface Window {
	IS_E2E?: boolean;
	useOfflineStore?: typeof import("./store/offlineStore").useOfflineStore;
}
