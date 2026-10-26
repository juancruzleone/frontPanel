import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8")

const actionPins: Record<string, string> = {
  "actions/checkout": "11d5960a326750d5838078e36cf38b85af677262 # v4",
  "actions/setup-node": "49933ea5288caeca8642d1e84afbd3f7d6820020 # v4",
  "oven-sh/setup-bun": "0c5077e51419868618aeaa5fe8019c62421857d6 # v2",
  "actions/upload-artifact": "ea165f8d65b6e75b540449e92b4886f43607fa02 # v4",
  "treosh/lighthouse-ci-action": "03becbfc543944dd6e7534f7ff768abb8a296826 # v10",
  "codecov/codecov-action": "b9fd7d16f6d7d1b5d2bec1a2887e65ceed900238 # v4",
  "trufflesecurity/trufflehog": "6c05c4a00b91aa542267d8e32a8254774799d68d # v3.93.8",
  "amondnet/vercel-action": "2d78157ee070f28ff89dd4da74e0369fc26d3b34 # v20",
  "softprops/action-gh-release": "3bb12739c298aeb8a4eeaf626c5b8d85266b0e65 # v2",
}

describe("tooling security configuration", () => {
  it.each(["ci", "performance", "security-scan"])("pins every action in %s to its resolved SHA without major upgrades", (name) => {
    const workflow = readProjectFile(`.github/workflows/${name}.yml`)
    const references = [...workflow.matchAll(/\buses:\s*(\S+)@([^\n]+)/g)]

    expect(references.length).toBeGreaterThan(0)
    for (const [, action, reference] of references) {
      expect(actionPins[action], action).toBeDefined()
      expect(reference.trim(), action).toBe(actionPins[action])
    }
  })

  it("documents only the approved deployment CLI versions and the audit gate", () => {
    const docs = readProjectFile("ci-cd/docs/DEPLOYMENT.md")
    const commands = docs.split("\n").filter((line) => /^(?:bunx |bun install --global |netlify |vercel )/.test(line))

    expect(commands.length).toBeGreaterThan(0)
    for (const command of commands) {
      expect(command).toMatch(/^bunx (?:netlify-cli@27\.14\.2|vercel@65\.2\.0)\b/)
    }
    expect(docs).toContain("bun audit --audit-level=moderate")
    expect(docs).toContain("Auditoría de seguridad falló. Deployment cancelado.")
  })
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
