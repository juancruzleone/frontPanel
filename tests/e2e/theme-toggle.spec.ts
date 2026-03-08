import { test, expect } from "@playwright/test"

test("el cambio de tema responde rápido y persiste tras recargar", async ({ page }) => {
  await page.goto("/")

  const toggle = page.getByRole("button", { name: /cambiar tema/i }).first()
  const initialState = await page.evaluate(() => {
    const isDark = document.documentElement.classList.contains("dark")
    const htmlTheme = document.documentElement.getAttribute("data-theme")
    const bodyTheme = document.body.getAttribute("data-theme")
    return { isDark, htmlTheme, bodyTheme }
  })

  const startedAt = Date.now()
  await toggle.click()
  await page.waitForFunction(
    (previousTheme) => document.documentElement.classList.contains("dark") !== previousTheme,
    initialState.isDark,
    { timeout: 1200 },
  )
  const elapsed = Date.now() - startedAt

  expect(elapsed).toBeLessThan(900)
  await page.waitForTimeout(700)

  const persistedTheme = await page.evaluate(() => localStorage.getItem("theme"))
  expect(persistedTheme).toBe(initialState.isDark ? "light" : "dark")

  const stateAfterToggle = await page.evaluate(() => {
    const isDark = document.documentElement.classList.contains("dark")
    const htmlTheme = document.documentElement.getAttribute("data-theme")
    const bodyTheme = document.body.getAttribute("data-theme")
    return { isDark, htmlTheme, bodyTheme }
  })
  expect(stateAfterToggle.isDark).toBe(!initialState.isDark)
  expect(stateAfterToggle.htmlTheme).toBe(initialState.isDark ? "light" : "dark")
  expect(stateAfterToggle.bodyTheme).toBe(initialState.isDark ? "light" : "dark")

  await page.reload()
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(700)

  const stateAfterReload = await page.evaluate(() => {
    const isDark = document.documentElement.classList.contains("dark")
    const htmlTheme = document.documentElement.getAttribute("data-theme")
    const bodyTheme = document.body.getAttribute("data-theme")
    return { isDark, htmlTheme, bodyTheme }
  })

  expect(stateAfterReload.isDark).toBe(stateAfterToggle.isDark)
  expect(stateAfterReload.htmlTheme).toBe(stateAfterToggle.htmlTheme)
  expect(stateAfterReload.bodyTheme).toBe(stateAfterToggle.bodyTheme)
})
