import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
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
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
      },
      chunkFileNames: 'assets/js/[name]-[hash].js',
      entryFileNames: 'assets/js/[name]-[hash].js',
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
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    }
  },
})
