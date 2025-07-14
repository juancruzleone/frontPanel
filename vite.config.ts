import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  server: {
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    }
  },
})
