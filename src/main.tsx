import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { router } from "./router"
import { ThemeProvider, useTheme } from "./shared/hooks/useTheme"
import { Toaster } from "sonner"
import "./index.css"
import "../src/styles/font.css"
import "./i18n"

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none',
    }).catch((error) => {
      console.error('Error al registrar service worker', error)
    })
  })
}

const ThemedToaster = () => {
  const { dark } = useTheme()

  return (
    <Toaster
      position="bottom-right"
      theme={dark ? "dark" : "light"}
      toastOptions={{
        classNames: {
          toast: "appToast",
          title: "appToastTitle",
          description: "appToastDescription",
        },
      }}
    />
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedToaster />
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
)
