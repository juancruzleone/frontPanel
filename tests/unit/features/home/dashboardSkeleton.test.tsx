import { readFileSync } from "node:fs"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import Skeleton from "../../../../src/shared/components/Skeleton"

const homeCss = readFileSync("src/features/home/styles/home.module.css", "utf8")
const sharedCss = readFileSync("src/shared/components/Skeleton.module.css", "utf8")

const rule = (css: string, selector: string): string => {
  const start = css.indexOf(`${selector} {`)
  return css.slice(start, css.indexOf("}", start) + 1)
}

describe("shared dashboard skeleton language", () => {
  it("preserves default dimensions and explicit style overrides", () => {
    const { container, rerender } = render(<Skeleton />)
    const skeleton = container.firstElementChild
    expect(skeleton).toHaveStyle({ height: "40px", width: "100%" })
    rerender(<Skeleton height={80} width="50%" style={{ height: 96, marginBottom: 0 }} />)
    expect(skeleton).toHaveStyle({ height: "96px", width: "50%", marginBottom: "0" })
    rerender(<Skeleton height="3rem" width={200} />)
    expect(skeleton).toHaveAttribute("style", "height: 3rem; width: 200px;")
  })

  it("uses its own module rather than an installations dependency", () => {
    const source = readFileSync("src/shared/components/Skeleton.tsx", "utf8")
    expect(source).toContain('from "./Skeleton.module.css"')
    expect(source).not.toContain("features/installations")
  })

  it("shares neutral theme tokens, radius, shimmer and reduced-motion behavior with home", () => {
    for (const css of [homeCss, sharedCss]) {
      const base = rule(css, ".skeleton")
      expect(base).toContain("border: 1px solid var(--state-neutral-border)")
      expect(base).toContain("border-radius: var(--radius-panel)")
      expect(base).toContain("background: var(--state-neutral-surface)")
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.skeleton::after\s*\{ animation: none; \}/)
    }
    expect(rule(sharedCss, ".skeleton::after")).toBe(rule(homeCss, ".skeleton::after"))
    expect(sharedCss).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(/i)
  })
})
