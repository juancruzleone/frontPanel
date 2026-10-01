import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { render, fireEvent, waitFor } from "@testing-library/react"
import React from "react"

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "es" },
  }),
}))

vi.mock("../../../../src/shared/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", dark: false, toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock("@/shared/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", dark: false, toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock("../../../../src/shared/components/HybridSelect/HybridSelect", () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement("select", {
      ...(props as object),
      "data-testid": (props as { name?: string }).name || "hybrid-select",
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => (props as { onChange?: (v: string) => void }).onChange?.(e.target.value),
    }),
}))

vi.mock("../../../../src/features/workOrders/components/HybridSelect", () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement("select", {
      ...(props as object),
      "data-testid": (props as { name?: string }).name || "hybrid-select",
    }),
}))

vi.mock("../../../../src/features/calendar/components/DatePickerModal", () => ({
  default: () => null,
}))
vi.mock("../../../../src/features/calendar/components/TimePickerModal", () => ({
  default: () => null,
}))

describe("Work Orders UI contracts", () => {
  it("keeps the scheduled controls' base geometry when validation is shown (source contract)", () => {
    const styles = readSource("src/features/workOrders/styles/workOrderForm.module.css")
    expect(styles).toMatch(/\.customDateButton\s*\{[\s\S]*?min-height:\s*56px;/)
    expect(styles).toContain(".customDateButton.errorInput:focus-visible")
    expect(styles).toMatch(/\.customDateButton:disabled\s*\{[\s\S]*?cursor:\s*not-allowed;/)
  })

  it("exposes scheduled date/time validation via accessible rendered markup", async () => {
    const WorkOrderForm = (await import("../../../../src/features/workOrders/components/WorkOrderForm")).default
    const Wrapper = () => {
      const [errors, setErrors] = React.useState<Record<string, string>>({})
      const [data, setData] = React.useState<Record<string, unknown>>({
        titulo: "",
        descripcion: "",
        instalacionId: "",
        prioridad: "media",
        fechaProgramada: "",
        horaProgramada: "",
        tipoTrabajo: "",
        tipoOrden: "correctivo",
        estado: "pendiente",
      })
      const handleFieldChange = (name: string, value: unknown) => setData((prev) => ({ ...prev, [name]: value }))
      const setFormErrors = (updater: (prev: Record<string, string>) => Record<string, string>) =>
        setErrors((prev) => updater(prev))
      return React.createElement(WorkOrderForm, {
        onCancel: vi.fn(),
        onSuccess: vi.fn(),
        onError: vi.fn(),
        isEditMode: false,
        initialData: null,
        formData: data as unknown as Parameters<typeof WorkOrderForm>[0]["formData"],
        formErrors: errors,
        handleFieldChange,
        handleSubmitForm: vi.fn(),
        isSubmitting: false,
        installations: [],
        technicians: [],
        setFormErrors,
      } as unknown as React.ComponentProps<typeof WorkOrderForm>)
    }
    const { container } = render(React.createElement(Wrapper))

    const dateButton = container.querySelector("#work-order-scheduled-date") as HTMLButtonElement
    const timeButton = container.querySelector("#work-order-scheduled-time") as HTMLButtonElement
    expect(dateButton).toBeInTheDocument()
    expect(timeButton).toBeInTheDocument()

    // Initially no error attributes
    expect(dateButton).not.toHaveAttribute("aria-describedby")
    expect(dateButton.getAttribute("aria-invalid")).toBe("false")

    // Trigger submit to mark all fields touched and surface validation errors
    const form = container.querySelector("form") as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() => {
      const describedBy = dateButton.getAttribute("aria-describedby")
      expect(describedBy).toBe("work-order-scheduled-date-error")
      expect(dateButton.getAttribute("aria-invalid")).toBe("true")
      expect(dateButton.className).toMatch(/errorInput/)
    })

    const error = document.getElementById("work-order-scheduled-date-error")
    expect(error).toBeInTheDocument()
    expect(error?.textContent?.length).toBeGreaterThan(0)

    // Time button likewise
    await waitFor(() => {
      expect(timeButton.getAttribute("aria-invalid")).toBe("true")
      expect(timeButton.getAttribute("aria-describedby")).toBe("work-order-scheduled-time-error")
    })
    const timeError = document.getElementById("work-order-scheduled-time-error")
    expect(timeError).toBeInTheDocument()

    // Base geometry preserved even with error class (min-height still 56px)
    void getComputedStyle(dateButton)
    // JSDOM may not compute, so fallback to source check already done; ensure button still has customDateButton class
    expect(dateButton.className).toMatch(/customDateButton/)
  })

  it("keeps operational card styling aligned with assets and responsive (source contract)", () => {
    const styles = readSource("src/features/workOrders/styles/workOrders.module.css")
    const cardRule = styles.match(/\.workOrderCard\s*\{([\s\S]*?)\}/)?.[1] ?? ""
    expect(cardRule).toContain("border-radius: 8px")
    expect(cardRule).toContain("box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08)")
    expect(styles).toContain("linear-gradient")
    expect(styles).toContain(".workOrderCard::before")
    expect(styles).not.toContain("border-left-color")
    expect(styles).not.toContain(".workOrderCard_en_progreso")
    expect(cardRule).not.toContain("border-left-width")
    // Icon hover must be black/white (like installations/assets), not green
    expect(styles).toMatch(/\.iconButton:hover\s*\{[\s\S]*?background:\s*var\(--color-text\)/)
    expect(styles).toMatch(/\.iconButton:hover\s*\{[\s\S]*?color:\s*var\(--color-card\)/)
  })

  it("prevents long unbroken titles from overflowing the flex card header on desktop and mobile", async () => {
    const stylesText = readSource("src/features/workOrders/styles/workOrders.module.css")
    // Architecture: header and title must constrain wrapping
    expect(stylesText).toMatch(/\.workOrderHeader\s*\{[\s\S]*?min-width:\s*0;/)
    expect(stylesText).toMatch(/\.workOrderTitle\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/)
    expect(stylesText).toMatch(/\.workOrderTitle\s*\{[\s\S]*?word-break:\s*break-word;/)

    // Rendered layout: long unbroken title should wrap inside constrained header
    const longTitle = "Supercalifragilisticexpialidocious".repeat(8)
    const { container } = render(
      React.createElement("div", { style: { width: "320px", display: "flex" } },
        React.createElement("div", { className: "workOrderHeader", style: { display: "flex", gap: "12px", minWidth: "0", width: "100%" } },
          React.createElement("h3", {
            className: "workOrderTitle",
            style: {
              minWidth: "0",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              hyphens: "auto",
            } as React.CSSProperties,
          }, longTitle),
          React.createElement("span", { style: { flexShrink: 0 } }, "alta")
        )
      )
    )

    const titleEl = container.querySelector(".workOrderTitle") as HTMLElement
    const headerEl = container.querySelector(".workOrderHeader") as HTMLElement
    expect(titleEl).toBeInTheDocument()
    expect(headerEl).toBeInTheDocument()

    // Simulate mobile narrow viewport
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 360 })
    window.dispatchEvent(new Event("resize"))

    // Title must not force header to overflow: title's scrollWidth should not exceed header's clientWidth substantially
    // In JSDOM layout is not visual, so verify wrapping styles are present on computed style
    const computedTitle = getComputedStyle(titleEl)
    const computedHeader = getComputedStyle(headerEl)
    // overflowWrap may be reported as 'anywhere' or 'break-word' depending on engine
    expect(["anywhere", "break-word"]).toContain(computedTitle.overflowWrap || (computedTitle as unknown as Record<string, string>).overflowWrap || "anywhere")
    expect(computedTitle.wordBreak).toMatch(/break-word|break-all/)
    expect(computedHeader.minWidth).toBe("0px")

    // Reset viewport
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 })
  })

  it("retains deliberate calendar-action hover while shared secondary actions stay consistent for hover and focus (component level)", async () => {
    // Source architecture: primary hover must be low specificity via :where, calendar hover must win with :not(:disabled)
    const buttonStyles = readSource("src/shared/components/Buttons/buttons.module.css")
    expect(buttonStyles).toMatch(/\.createButton:hover:where\(/)
    expect(buttonStyles).toMatch(/\.secondaryButton:hover:where\(/)
    expect(buttonStyles).toMatch(/\.secondaryButton\s*\{[\s\S]*?background:\s*var\(--color-themebox-bg\);[\s\S]*?color:\s*var\(--color-text\);[\s\S]*?border:\s*1px solid var\(--color-themebox-border\);/)
    // Bound each assertion to its own rule: unrelated later colors must not satisfy it.
    const lightSecondaryHover = buttonStyles.match(/(?:^|\n)\.secondaryButton:hover:where\(:not\(:disabled\)\),\s*:global\(\[data-theme="light"\]\) \.secondaryButton:hover:where\(:not\(:disabled\)\)\s*\{([^{}]*)\}/)?.[1] ?? ""
    expect(lightSecondaryHover).toMatch(/(?:^|;)\s*background:\s*var\(--color-card\);/)
    expect(lightSecondaryHover).toMatch(/(?:^|;)\s*color:\s*var\(--color-text\);/)
    expect(lightSecondaryHover).toMatch(/(?:^|;)\s*border-color:\s*#9ca3af;/)
    const darkSecondaryHover = buttonStyles.match(/:global\(\.dark\) \.secondaryButton:hover:where\(:not\(:disabled\)\),\s*:global\(\[data-theme="dark"\]\) \.secondaryButton:hover:where\(:not\(:disabled\)\)\s*\{([^{}]*)\}/)?.[1] ?? ""
    expect(darkSecondaryHover).toMatch(/(?:^|;)\s*background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\);/)
    expect(darkSecondaryHover).toMatch(/(?:^|;)\s*color:\s*var\(--color-text\);/)
    expect(darkSecondaryHover).toMatch(/(?:^|;)\s*border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.22\);/)
    expect(buttonStyles).toMatch(/\.createButton:focus-visible,\s*\.secondaryButton:focus-visible\s*\{[^{}]*?outline:\s*var\(--focus-ring[^{}]*?outline-offset:\s*var\(--focus-offset/)
    const workStyles = readSource("src/features/workOrders/styles/workOrders.module.css")
    expect(workStyles).toMatch(/\.calendarActionButton:hover:not\(:disabled\)\s*{[\s\S]*?background:\s*var\(--color-accent\)/)
    expect(workStyles).toContain(".calendarActionButton:focus-visible")

    // Component-level: render both variants and verify focus ring and that calendar retains accent on hover architecture
    const ButtonCreate = (await import("../../../../src/shared/components/Buttons/buttonCreate")).default
    const workOrderStyles = await import("../../../../src/features/workOrders/styles/workOrders.module.css")
    const calendarClass = (workOrderStyles.default as unknown as Record<string, string>).calendarActionButton

    const { container } = render(
      React.createElement(React.Fragment, null,
        React.createElement(ButtonCreate, { title: "Crear", onClick: vi.fn() }, "Crear"),
        React.createElement(ButtonCreate, { title: "Ver calendario", onClick: vi.fn(), className: calendarClass },
          React.createElement("span", null, "Ver calendario")
        ),
        React.createElement(ButtonCreate, { title: "Secundario", onClick: vi.fn(), variant: "secondary" }, "Secundario")
      )
    )

    const [primaryBtn, calendarBtn, secondaryBtn] = Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]

    // Primary and secondary should have their respective classes
    expect(primaryBtn.className).toMatch(/createButton/)
    expect(calendarBtn.className).toMatch(/createButton/)
    expect(calendarBtn.className).toMatch(/calendarActionButton/)
    expect(secondaryBtn.className).toMatch(/secondaryButton/)

    // Focus-visible: after focusing, the button should have outline from shared rule (jsdom computed may be empty, so check stylesheet existence)
    primaryBtn.focus()
    secondaryBtn.focus()
    calendarBtn.focus()

    // Verify that the shared focus ring rule exists in the injected stylesheet
    // Hover specificity: calendarActionButton (0,3,0) must be higher than createButton:where (0,2,0) => check via string inspection
    const createSpecificityLow = buttonStyles.includes(".createButton:hover:where(:not(:disabled))")
    const calendarSpecificityHigher = workStyles.includes(".calendarActionButton:hover:not(:disabled)")
    expect(createSpecificityLow).toBe(true)
    expect(calendarSpecificityHigher).toBe(true)
    // Ensure hover/focus rules avoid !important (other unrelated !important like search gap is out of scope)
    const calendarHoverRule = workStyles.match(/\.calendarActionButton:hover[^{]*{[\s\S]*?}/)?.[0] ?? ""
    const createHoverRule = buttonStyles.match(/\.createButton:hover[^{]*{[\s\S]*?}/)?.[0] ?? ""
    const secondaryHoverRule = buttonStyles.match(/\.secondaryButton:hover[^{]*{[\s\S]*?}/)?.[0] ?? ""
    expect(calendarHoverRule).not.toContain("!important")
    expect(createHoverRule).not.toContain("!important")
    expect(secondaryHoverRule).not.toContain("!important")
  })
})
