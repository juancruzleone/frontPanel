import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "offline-app-shell.spec.ts",
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // El binario Chromium de Playwright no puede descargarse en este equipo
    // (error de escritura -122). Se usa el Google Chrome estable del sistema.
    channel: "chrome",
  },
  // Con 12 workers los tests con Service Worker y temporizadores de sync
  // (offline-*) compiten por CPU y se vuelven flaky. 4 mantiene la suite
  // estable y sigue siendo rápida.
  workers: 4,
  webServer: {
    command: "bun run dev --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 120000,
  },
})
