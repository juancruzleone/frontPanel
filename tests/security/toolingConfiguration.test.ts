import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8")

describe("tooling security configuration", () => {
  it("keeps TLS verification enabled for Vite API and WebSocket proxies", () => {
    const viteConfig = readProjectFile("vite.config.ts")

    expect(viteConfig).not.toMatch(/secure\s*:\s*false/)
  })

  it("gates builds and releases on the dependency audit", () => {
    const workflow = readProjectFile(".github/workflows/ci.yml")
    const auditJob = workflow.match(/ {2}security-audit:[\s\S]*?\n {2}# Job 3:/)?.[0] ?? ""
    const auditStep = auditJob.match(/ {6}- name: Run bun audit[\s\S]*?(?=\n {6}- name:)/)?.[0] ?? ""
    const buildJob = workflow.match(/ {2}build:[\s\S]*?\n {2}# Job 8:/)?.[0] ?? ""

    expect(auditStep).toContain("bun audit --audit-level=moderate")
    expect(auditStep).not.toContain("continue-on-error: true")
    expect(buildJob).toMatch(/needs: \[[^\]]*security-audit[^\]]*\]/)
  })

  it("does not use a blanket dependency update as an audit fix", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts["security:audit:fix"]).not.toBe("bun update")
    expect(packageJson.scripts["security:audit:fix"]).toContain("bun audit")
  })
})
