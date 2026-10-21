import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import LoginForm from "../../../../src/features/auth/components/LoginForm"
import { startOAuthLogin } from "../../../../src/features/auth/services/oauthServices"

const LABELS: Record<string, string> = {
  "login.title": "Iniciar Sesión",
  "login.panelSubtitle": "Accede al panel CMMS.",
  "login.username": "Usuario",
  "login.password": "Contraseña",
  "login.usernamePlaceholder": "Ingresa tu usuario",
  "login.passwordPlaceholder": "Ingresa tu contraseña",
  "login.submit": "Iniciar Sesión",
  "login.showPassword": "Mostrar contraseña",
  "auth.oauth.google": "Continuar con Google",
  "auth.oauth.microsoft": "Continuar con Microsoft",
  "auth.oauth.divider": "o continúa con tu cuenta de trabajo",
  "auth.oauth.redirecting": "Redirigiendo a Google…",
  "auth.oauth.unavailable": "No pudimos iniciar la sesión social.",
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => LABELS[key] ?? key,
    i18n: { language: "es" },
  }),
}))

vi.mock("../../../../src/shared/components/Buttons/LanguageSelector", () => ({
  default: () => null,
}))

vi.mock("../../../../src/shared/components/Buttons/ThemeToggle", () => ({
  default: () => null,
}))

vi.mock("../../../../src/features/auth/services/oauthServices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../src/features/auth/services/oauthServices")>()
  return { ...actual, startOAuthLogin: vi.fn(() => true) }
})

const passwordLoginProps = () => ({
  username: "",
  password: "",
  errors: {},
  showPassword: false,
  handleUsernameChange: vi.fn(),
  handlePasswordChange: vi.fn(),
  togglePasswordVisibility: vi.fn(),
  handleSubmit: vi.fn(),
})

const renderLogin = (pathname = "/", props = passwordLoginProps()) => ({
  props,
  ...render(
    <MemoryRouter initialEntries={[pathname]}>
      <LoginForm {...props} />
    </MemoryRouter>,
  ),
})

describe("login social controls", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("publishes both backPanel providers as accessible controls", () => {
    renderLogin()

    expect(screen.getByRole("button", { name: "Continuar con Google" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continuar con Microsoft" })).toBeInTheDocument()
    expect(screen.getByLabelText("Usuario")).toBeInTheDocument()
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument()
  })

  it("navigates top-level to backPanel with the localized home as the safe return target", async () => {
    const { props } = renderLogin()
    await userEvent.click(screen.getByRole("button", { name: "Continuar con Google" }))

    expect(startOAuthLogin).toHaveBeenCalledTimes(1)
    expect(startOAuthLogin).toHaveBeenCalledWith(expect.objectContaining({
      provider: "google",
      returnTo: "/inicio",
    }))
    expect(props.handleSubmit).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("keeps the origin page when the visitor arrived on a localized app route", async () => {
    renderLogin("/ordenes-trabajo")
    await userEvent.click(screen.getByRole("button", { name: "Continuar con Microsoft" }))

    expect(startOAuthLogin).toHaveBeenCalledWith(expect.objectContaining({
      provider: "microsoft",
      returnTo: "/ordenes-trabajo",
    }))
  })

  it("never leaks the OAuth callback route back as a return target", async () => {
    renderLogin("/ordenes-trabajo")
    await userEvent.click(screen.getByRole("button", { name: "Continuar con Google" }))

    const returnTo = vi.mocked(startOAuthLogin).mock.calls[0][0].returnTo
    expect(returnTo).not.toContain("oauth")
    expect(returnTo).not.toContain("callback")
  })

  it("disables every social control and announces the redirect while navigating", async () => {
    renderLogin()
    const google = screen.getByRole("button", { name: "Continuar con Google" })
    const microsoft = screen.getByRole("button", { name: "Continuar con Microsoft" })

    await userEvent.click(google)

    await waitFor(() => expect(google).toBeDisabled())
    expect(microsoft).toBeDisabled()
    expect(google).toHaveAttribute("aria-busy", "true")
    expect(screen.getByRole("status")).toHaveTextContent("Redirigiendo a Google…")
  })

  it("recovers the controls when backPanel would refuse the start", async () => {
    vi.mocked(startOAuthLogin).mockReturnValue(false)
    renderLogin()

    await userEvent.click(screen.getByRole("button", { name: "Continuar con Google" }))

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos iniciar la sesión social.",
    ))
    expect(screen.getByRole("button", { name: "Continuar con Google" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Continuar con Microsoft" })).toBeEnabled()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("preserves the password login flow untouched", async () => {
    const { props } = renderLogin()
    const submit = screen.getByRole("button", { name: "Iniciar Sesión" })

    await userEvent.type(screen.getByLabelText("Usuario"), "tec")
    await userEvent.click(submit)

    expect(props.handleUsernameChange).toHaveBeenCalledWith("t")
    expect(props.handleSubmit).toHaveBeenCalledTimes(1)
    expect(submit).toBeEnabled()
  })

  it("keeps social controls out of the password form submission", async () => {
    const { props } = renderLogin()

    await userEvent.click(screen.getByRole("button", { name: "Continuar con Google" }))

    expect(props.handleSubmit).not.toHaveBeenCalled()
    expect(vi.mocked(startOAuthLogin).mock.calls[0][0]).not.toHaveProperty("password")
  })
})
