import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const devCsp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
	"script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: https:",
	"font-src 'self' data:",
	"connect-src 'self' https://api.leonix.net.ar wss://api.leonix.net.ar https://cloudflareinsights.com https://static.cloudflareinsights.com ws://localhost:5173 ws://localhost:3000",
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'",
].join("; ");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const apiProxyTarget =
		env.VITE_API_PROXY_TARGET || "https://api.leonix.net.ar";

	return {
		plugins: [react()],
		base: "/",
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
				"@/store": path.resolve(__dirname, "./src/store"),
				"@/shared": path.resolve(__dirname, "./src/shared"),
				"@/features": path.resolve(__dirname, "./src/features"),
			},
		},
		build: {
			rollupOptions: {
				output: {
					manualChunks: undefined,
					assetFileNames: (assetInfo) => {
						const info = assetInfo.name.split(".");
						const ext = info[info.length - 1];
						if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
							return `assets/images/[name]-[hash][extname]`;
						}
						if (/css/i.test(ext)) {
							return `assets/css/[name]-[hash][extname]`;
						}
						return `assets/[name]-[hash][extname]`;
					},
				},
				chunkFileNames: "assets/js/[name]-[hash].js",
				entryFileNames: "assets/js/[name]-[hash].js",
			},
			target: "esnext",
			minify: "esbuild",
			sourcemap: false,
			outDir: "dist",
			assetsDir: "assets",
		},
		optimizeDeps: {
			include: ["react", "react-dom"],
		},
		server: {
			headers: {
				"Content-Security-Policy": devCsp,
				"X-Frame-Options": "DENY",
				"X-Content-Type-Options": "nosniff",
				"Referrer-Policy": "strict-origin-when-cross-origin",
				"Permissions-Policy": "geolocation=(), microphone=(), camera=()",
			},
			proxy: {
				"/api": {
					target: apiProxyTarget,
					changeOrigin: true,
					secure: false,
				},
				"/socket.io": {
					target: apiProxyTarget,
					changeOrigin: true,
					secure: false,
					ws: true,
				},
			},
			hmr: {
				protocol: "ws",
				host: "localhost",
				port: 5173,
			},
		},
	};
});
