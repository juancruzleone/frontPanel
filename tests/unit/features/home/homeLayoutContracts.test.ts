import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const homeCss = readFileSync("src/features/home/styles/home.module.css", "utf8")
const tokensCss = readFileSync("src/shared/styles/dashboard-tokens.css", "utf8")

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Every declaration block written for a selector (base rule + media rules). */
const block = (css: string, selector: string): string => {
  const pattern = new RegExp(`(?:^|\\n)${escapeRegExp(selector)}\\s*\\{([^{}]*)\\}`, "g")
  return [...css.matchAll(pattern)].map((match) => match[1]).join("\n")
}

const declaration = (css: string, selector: string, property: string): string => {
  const match = block(css, selector).match(new RegExp(`${property}:\\s*([^;]+);`))
  return match?.[1].trim() ?? ""
}

const tokenPx = (name: string): number => {
  const raw = tokensCss.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1] ?? ""
  const resolved = raw.startsWith("var(") ? tokenPx(raw.replace(/var\(--| *\)/g, "")) : Number.parseFloat(raw)
  return Number.isFinite(resolved) ? resolved : 0
}

const resourceLinkHoverRule = homeCss.match(/(?:^|\n)\.resourceLink:hover,\n\.resourceLink:focus-visible \{([^{}]*)\}/)?.[1] ?? ""
const resourceLinkRestRule = homeCss.match(/(?:^|\n)\.resourceLink \{([^{}]*)\}/)?.[1] ?? ""

describe("home dashboard top-alignment contract", () => {
  it("never vertically centres KPI cell content", () => {
    const cell = block(homeCss, ".kpiCell")
    expect(cell).toContain("justify-content: flex-start")
    expect(cell).not.toMatch(/justify-content:\s*center/)
    expect(cell).not.toMatch(/align-self:\s*start/)
  })

  it("puts the first-row label on the same offset as the attention panel kicker", () => {
    // Card border (1px) + band padding + cell padding must equal the panel's
    // 1px border + panel padding, so both titles start at the same height.
    expect(declaration(homeCss, ".kpiBand", "padding")).toBe("var(--space-md)")
    expect(declaration(homeCss, ".kpiCell", "padding").split(" ")[0]).toBe("var(--space-md)")
    expect(declaration(homeCss, ".attentionPanel", "padding")).toBe("var(--space-panel-lg)")

    const bandLabelOffset = 1 + tokenPx("space-md") + tokenPx("space-md")
    const kickerOffset = 1 + tokenPx("space-panel-lg")
    expect(bandLabelOffset).toBe(kickerOffset)
    expect(bandLabelOffset).toBe(33)
  })

  it("keeps the band equal-height and balanced instead of parking the slack below the tiles", () => {
    const band = block(homeCss, ".kpiBand")
    expect(band).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))")
    expect(band).toContain("grid-auto-rows: 1fr")
    expect(band).toContain("align-self: stretch")
    expect(band).not.toMatch(/align-content:\s*(start|center)/)
    // Eight metrics therefore land on four equal rows inside the shared 659px.
    expect(homeCss).toContain(".kpiCell:nth-child(2n + 1) {\n  border-left: 0;\n}")
    expect(homeCss).toContain(".kpiCell:nth-child(n + 3) {\n  border-top: 1px solid var(--color-card-border);\n}")
  })

  it("tightens the internal rhythm of a cell without dropping contextual detail", () => {
    expect(block(homeCss, ".kpiCell")).toContain("gap: var(--space-3xs)")
    expect(declaration(homeCss, ".kpiDetail", "margin-top")).toBe("var(--space-2xs)")
    expect(declaration(homeCss, ".kpiProgress", "margin-top")).toBe("var(--space-2xs)")
    expect(homeCss).toContain(".panel,\n.inventorySummary {\n  padding: var(--space-panel-lg);\n}")
  })
})

describe("resource band hover contract", () => {
  const hoverRule = resourceLinkHoverRule

  it("steps the weight up without touching the colour", () => {
    expect(hoverRule).not.toBe("")
    expect(hoverRule).toContain("font-weight: 800")
    expect(hoverRule).toContain("text-decoration: underline")
    expect(hoverRule).toContain("text-decoration-thickness: 2px")
    expect(hoverRule).toContain("color: var(--color-text)")
    expect(hoverRule).not.toMatch(/--state-(info|accent|secondary)/)
    expect(hoverRule.match(/color:/g)).toHaveLength(1)
  })

  it("keeps an explicit resting weight below the hovered weight in both themes", () => {
    expect(declaration(homeCss, ".resourceLink", "font-weight")).toBe("700")
    expect(declaration(homeCss, ".resourceBand dt", "font-weight")).toBe("700")
    expect(declaration(homeCss, ".resourceLink", "color")).toBe("var(--color-text)")
    // Only the focus ring may reference theme accents; the link itself never
    // changes colour between rest, hover, light theme and dark theme.
    expect(`${resourceLinkRestRule}${resourceLinkHoverRule}`).not.toMatch(/--state-|--color-secondary|--color-accent/)
  })

  it("keeps the focus outline visible", () => {
    expect(homeCss).toContain(".resourceLink:focus-visible {\n  outline: 2px solid var(--color-text);")
  })
})

describe("chart data table toggle spacing", () => {
  it("clears the chart surface above the toggle with a token", () => {
    expect(declaration(homeCss, ".chartDataTable", "margin-top")).toBe("var(--space-xl)")
    expect(tokenPx("space-xl")).toBeGreaterThanOrEqual(20)
    expect(homeCss).toContain(".chartDataTable summary {\n  width: fit-content;")
    expect(homeCss).toContain(".chartDataTable summary:hover {\n  color: var(--color-text);")
    expect(homeCss).toContain(".chartDataTable summary:focus-visible,\n.resourceLink:focus-visible {\n  outline: 2px solid var(--color-text);")
  })
})

describe("recent work order rows are real controls", () => {
  it("styles the row trigger and its visible detail button", () => {
    const row = block(homeCss, ".orderRow")
    expect(row).toContain("background: none")
    expect(row).toContain("cursor: pointer")
    expect(row).toContain("text-align: left")
    expect(homeCss).toContain(".orderRow:focus-visible {\n  outline: var(--focus-ring")
    expect(block(homeCss, ".orderDetailButton")).toContain("cursor: pointer")
    expect(homeCss).toContain(".orderDetailButton:focus-visible {\n  outline: 2px solid var(--color-text);")
    expect(homeCss).toContain(".detailLayer {\n  display: contents;\n}")
  })

  it("gives the recent orders panel room under the divider and between rows", () => {
    // Header air, a taller row band, and separation around the chip column are
    // scoped to the dashboard list so the shared tenant rows keep their rhythm.
    expect(declaration(homeCss, ".panelHeader", "padding-bottom")).toBe("var(--space-xl)")
    expect(declaration(homeCss, ".recentOrdersList", "padding-top")).toBe("var(--space-sm)")
    expect(declaration(homeCss, ".recentOrdersList .orderItem", "padding")).toBe("var(--space-lg) var(--space-xs)")
    expect(declaration(homeCss, ".recentOrdersList .orderItem", "gap")).toBe("var(--space-xl)")
    expect(declaration(homeCss, ".recentOrdersList .orderMeta", "gap")).toBe("var(--space-lg)")
    expect(homeCss).toContain(".recentOrdersList .orderStatus,\n.recentOrdersList .orderDetailButton {\n  padding-block: var(--space-2xs);\n}")
    expect(tokenPx("space-xl")).toBeGreaterThanOrEqual(24)
    expect(tokenPx("space-2xs")).toBeGreaterThanOrEqual(8)
    // Relief, not a sparse card: rows keep a 20px band inside a 32px panel.
    expect(tokenPx("space-panel-lg")).toBe(32)
    expect(declaration(homeCss, ".orderItem", "padding")).toBe("var(--space-md) var(--space-xs)")
  })

  it("stacks the recent rows without inheriting the desktop column gap", () => {
    const mobile = homeCss.slice(homeCss.indexOf("@media (max-width: 640px)"))
    expect(mobile).toMatch(/\.recentOrdersList \{ padding-top: var\(--space-2xs\); \}/)
    expect(mobile).toMatch(/\.recentOrdersList \.orderItem \{ gap: var\(--space-sm\); padding: var\(--space-md\) var\(--space-xs\); \}/)
    expect(mobile).toMatch(/\.recentOrdersList \.orderMeta \{[^}]*flex-wrap: wrap/)
  })

  it("keeps the shared orderItem label block intact for other consumers", () => {
    expect(homeCss).toContain(".orderItem > div:first-child,\n.orderRow {\n  display: grid;")
    expect(homeCss).toContain(".orderItem > div:first-child span,\n.orderRow span,\n.orderMeta time {")
  })
})

describe("dashboard CSS invariants", () => {
  it("ships no raw colours, no important flags and no env() inside calc()", () => {
    expect(homeCss).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i)
    expect(homeCss).not.toMatch(/calc\([^)]*env\(/)
    expect(homeCss).not.toMatch(/!important/)
  })

  it("respects reduced motion for every transition", () => {
    const reduced = homeCss.slice(homeCss.lastIndexOf("@media (prefers-reduced-motion: reduce)"))
    expect(reduced).toContain(".orderDetailButton,")
    expect(reduced).toContain(".panelAction,")
  })

  it("keeps both responsive breakpoints in place", () => {
    expect(homeCss).toContain("@media (max-width: 1050px)")
    expect(homeCss).toContain("@media (max-width: 640px)")
  })
})
