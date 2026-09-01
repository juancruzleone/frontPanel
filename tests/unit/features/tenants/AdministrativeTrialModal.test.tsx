import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { AdministrativeTrialModal } from "../../../../src/features/tenants/components/AdministrativeTrialModal"
import { tenantServices } from "../../../../src/features/tenants/services/tenantServices"
import "../../../../src/i18n"
import { useState } from "react"

vi.mock("../../../../src/features/tenants/services/tenantServices", () => ({
  tenantServices: { createAdministrativeTrial: vi.fn() },
}))

const ModalHarness = ({ onSuccess = vi.fn() }: { onSuccess?: () => void | Promise<void> }) => {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open trial</button>
      <AdministrativeTrialModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSuccess={onSuccess} />
    </>
  )
}

describe("AdministrativeTrialModal", () => {
  beforeEach(() => vi.clearAllMocks())

  it("validates the canonical plan before sending", async () => {
    const onSuccess = vi.fn()
    const { container } = render(<AdministrativeTrialModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />)
    const form = container.querySelector("form") as HTMLFormElement
    fireEvent.change(form.elements.namedItem("plan") as HTMLSelectElement, { target: { value: "invalid" } })
    fireEvent.submit(form)
    expect(await screen.findByText(/selecciona un plan válido|select a valid plan/i)).toBeInTheDocument()
    expect(tenantServices.createAdministrativeTrial).not.toHaveBeenCalled()
  })

  it("sends the exact form payload, closes, and clears the password", async () => {
    const onSuccess = vi.fn()
    vi.mocked(tenantServices.createAdministrativeTrial).mockResolvedValue({
      success: true,
      message: "Created",
      tenant: { tenantId: "tenant-1", name: "Acme", subdomain: "acme", plan: "starter" },
      user: { userName: "acme_admin", email: "owner@example.test", role: "admin" },
      administrativeTrial: { id: "trial-1", status: "active", plan: "starter", startsAt: "2026-08-31", endsAt: "2026-09-30" },
    })
    const { container } = render(<ModalHarness onSuccess={onSuccess} />)
    const form = container.querySelector("form") as HTMLFormElement
    fireEvent.change(form.elements.namedItem("companyName") as HTMLInputElement, { target: { value: "Acme" } })
    fireEvent.change(form.elements.namedItem("email") as HTMLInputElement, { target: { value: "owner@example.test" } })
    fireEvent.change(form.elements.namedItem("password") as HTMLInputElement, { target: { value: "Password1!" } })
    fireEvent.change(form.elements.namedItem("plan") as HTMLSelectElement, { target: { value: "starter" } })
    fireEvent.submit(form)

    expect(tenantServices.createAdministrativeTrial).toHaveBeenCalledWith({
      companyName: "Acme",
      email: "owner@example.test",
      password: "Password1!",
      plan: "starter",
    })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText("Open trial"))
    expect((document.querySelector('input[name="password"]'))).toHaveValue("")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it.each(["escape", "backdrop", "cancel", "close"] as const)("resets the password after the %s close path", async (closePath) => {
    render(<ModalHarness />)
    const password = document.querySelector('input[name="password"]') as HTMLInputElement
    fireEvent.change(password, { target: { value: "Password1!" } })

    if (closePath === "escape") fireEvent.keyDown(window, { key: "Escape" })
    if (closePath === "backdrop") fireEvent.mouseDown(document.querySelector('[role="dialog"]')?.parentElement as HTMLElement)
    if (closePath === "cancel") fireEvent.click(screen.getByText(/cancelar|cancel/i))
    if (closePath === "close") fireEvent.click(document.querySelector('button[aria-label="Cerrar"], button[aria-label="Close"]') as HTMLButtonElement)

    await waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText("Open trial"))
    expect(document.querySelector('input[name="password"]')).toHaveValue("")
  })

  it("clears validation errors when closed and reopened", async () => {
    const { container } = render(<ModalHarness />)
    const form = container.querySelector("form") as HTMLFormElement
    fireEvent.change(form.elements.namedItem("plan") as HTMLSelectElement, { target: { value: "invalid" } })
    fireEvent.submit(form)
    await waitFor(() => expect(document.querySelector('[role="alert"]')).toBeInTheDocument())

    fireEvent.keyDown(window, { key: "Escape" })
    fireEvent.click(screen.getByText("Open trial"))
    expect(document.querySelector('[role="alert"]')).not.toBeInTheDocument()
  })
})
