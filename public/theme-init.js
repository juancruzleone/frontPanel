(function () {
  const stored = localStorage.getItem("theme")
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const isDark = stored === "dark" || (stored !== "light" && prefersDark)

  if (isDark) {
    document.documentElement.classList.add("dark")
    document.documentElement.setAttribute("data-theme", "dark")
    if (document.body) {
      document.body.classList.add("dark")
      document.body.setAttribute("data-theme", "dark")
    }
    return
  }

  document.documentElement.classList.remove("dark")
  document.documentElement.setAttribute("data-theme", "light")
  if (document.body) {
    document.body.classList.remove("dark")
    document.body.setAttribute("data-theme", "light")
  }
})()
