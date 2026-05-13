import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { router } from "./router"
import { ThemeProvider } from "./shared/hooks/useTheme"
import "./index.css"
import "../src/styles/font.css"
import "./i18n"
import { ThemedToaster, AppInitializer } from "./AppProviders"
import { offlineSyncService } from "./shared/services/offlineSyncService"

// Registrar Service Worker para PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => undefined)
  })
}

// Inicializar servicio de sincronización offline
offlineSyncService.initialize()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedToaster />
      <AppInitializer>
        <RouterProvider router={router} />
      </AppInitializer>
    </ThemeProvider>
  </React.StrictMode>,
)
