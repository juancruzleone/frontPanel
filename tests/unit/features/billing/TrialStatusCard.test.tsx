import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { TrialStatusCard } from "../../../../src/features/billing/components/TrialStatusCard"
import { getTrialDateState } from "../../../../src/features/billing/utils/trialDates"
import "../../../../src/i18n"

const trial = { status: "active", plan: "professional" as const, startsAt: "2026-08-01T00:00:00Z", endsAt: "2026-09-01T00:00:00Z" }

describe("TrialStatusCard", () => {
  it("rounds partial remaining days up", () => {
    render(<MemoryRouter><TrialStatusCard trial={trial} now={new Date("2026-08-30T12:00:00Z")} /></MemoryRouter>)
    expect(screen.getByText(/2 días|2 days/)).toBeInTheDocument()
  })

  it("distinguishes expired and invalid dates from today", () => {
    const { rerender } = render(<MemoryRouter><TrialStatusCard trial={trial} now={new Date("2026-09-02T00:00:00Z")} /></MemoryRouter>)
    expect(screen.getByText(/ha finalizado|has ended/i)).toBeInTheDocument()
    rerender(<MemoryRouter><TrialStatusCard trial={{ ...trial, endsAt: "invalid" }} /></MemoryRouter>)
    expect(screen.getByText(/no está disponible|is unavailable/i)).toBeInTheDocument()
  })

  it("classifies invalid, past, today and future instants without UTC day drift", () => {
    const now = new Date("2026-09-01T12:00:00Z")
    expect(getTrialDateState("invalid", now)).toBe("invalid")
    expect(getTrialDateState("2026-09-01T11:59:59Z", now)).toBe("expired")
    expect(getTrialDateState("2026-09-01T23:00:00Z", now)).toBe("today")
    expect(getTrialDateState("2026-09-02T00:00:00Z", now)).toBe("active")
  })

  it("uses the user's calendar day instead of the UTC date", () => {
    const previousTimeZone = process.env.TZ
    process.env.TZ = "Asia/Tokyo"
    try {
      const now = new Date("2026-09-01T23:30:00Z")
      expect(getTrialDateState("2026-09-02T00:30:00Z", now)).toBe("today")
    } finally {
      process.env.TZ = previousTimeZone
    }
  })
})
