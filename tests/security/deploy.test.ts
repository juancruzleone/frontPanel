import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

const script = resolve(process.cwd(), "ci-cd/scripts/deploy.sh")
const scratch: string[] = []
const timestamp = "2026-01-02 03:04:05"
const log = (message: string) => `\x1b[0;32m[${timestamp}]\x1b[0m ${message}\n`
const error = (message: string) => `\x1b[0;31m[ERROR]\x1b[0m ${message}\n`
const preflightCalls = ["bun ci --ignore-scripts", "bun run lint", "bun run type-check", "bun run test", "bun audit --audit-level=moderate"]
const preflightOutput = (environment: string) => `🚀 Iniciando deployment a ${environment}...\n` + [
  "📦 Instalando dependencias...", "🔍 Ejecutando linting...", "📝 Verificando tipos...",
  "🧪 Ejecutando tests...", "🔒 Ejecutando security audit...",
].map(log).join("")

interface DeployOptions {
  environment: "staging" | "production"
  platform: "netlify" | "vercel"
  auditExit?: number
  branch?: string
  dirty?: boolean
}

const runDeploy = ({ environment, platform, auditExit = 0, branch = environment === "production" ? "main" : "develop", dirty = false }: DeployOptions) => {
  const directory = mkdtempSync(join(tmpdir(), "deploy-security-"))
  scratch.push(directory)
  const bin = join(directory, "bin")
  mkdirSync(bin)
  const callsFile = join(directory, "calls")
  writeFileSync(callsFile, "")
  const mocks = {
    git: 'case "$*" in "branch --show-current") printf "%s\\n" "$BRANCH" ;; "status -s") printf "%s" "$DIRTY" ;; *) exit 99 ;; esac',
    date: 'case "$1" in +%Y%m%d_%H%M%S) printf "20260102_030405\\n" ;; *) printf "2026-01-02 03:04:05\\n" ;; esac',
    bun: 'printf "bun %s\\n" "$*" >> "$CALLS"\nif [[ "$1" == audit ]]; then\n  if [[ "$AUDIT_EXIT" != 0 ]]; then printf "mock audit failure\\n" >&2; fi\n  exit "$AUDIT_EXIT"\nfi\nif [[ "$*" == "run build" || "$*" == "run build:staging" ]]; then /bin/mkdir -p dist; fi',
    bunx: 'printf "bunx %s\\n" "$*" >> "$CALLS"',
  }
  for (const [name, body] of Object.entries(mocks)) {
    writeFileSync(join(bin, name), `#!/bin/bash\n${body}\n`, { mode: 0o755 })
  }
  const result = spawnSync("/bin/bash", [script, environment], {
    cwd: directory,
    // Do not inherit real credentials, shell startup hooks, or executable search paths.
    env: {
      PATH: bin, HOME: directory, TMPDIR: directory, CALLS: callsFile,
      BRANCH: branch, DIRTY: dirty ? " M example.ts" : "", AUDIT_EXIT: String(auditExit),
      NETLIFY_AUTH_TOKEN: platform === "netlify" ? "mock-token" : "",
      VERCEL_TOKEN: platform === "vercel" ? "mock-token" : "",
    },
    encoding: "utf8",
    timeout: 3000,
  })
  expect(result.error).toBeUndefined()
  return { ...result, calls: readFileSync(callsFile, "utf8").trim().split("\n").filter(Boolean), built: existsSync(join(directory, "dist")) }
}

afterEach(() => {
  for (const directory of scratch.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe.each(["staging", "production"] as const)("direct %s deployment", (environment) => {
  it.each([1, 2, 127])("stops before build or deploy when audit exits %s", (auditExit) => {
    const result = runDeploy({ environment, platform: "netlify", auditExit })

    expect(result.status).toBe(1)
    expect(result.stdout).toBe(preflightOutput(environment) + error("Auditoría de seguridad falló. Deployment cancelado."))
    expect(result.stderr).toBe("mock audit failure\n")
    expect(result.calls).toEqual(preflightCalls)
    expect(result.built).toBe(false)
  })

  it.each(["netlify", "vercel"] as const)("keeps successful audited %s deployments with a pinned CLI", (platform) => {
    const result = runDeploy({ environment, platform })
    const production = environment === "production"
    const deploy = platform === "netlify"
      ? `bunx netlify-cli@27.14.2 deploy${production ? " --prod" : ""} --dir=dist`
      : `bunx vercel@65.2.0${production ? " --prod" : ""}`

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.calls).toEqual([...preflightCalls, `bun run ${production ? "build" : "build:staging"}`, deploy])
    expect(result.built).toBe(true)
    expect(result.stdout).toBe(preflightOutput(environment) + [
      "🏗️  Construyendo aplicación...", "✅ Build completado exitosamente",
      `🌐 Deploying a ${platform === "netlify" ? "Netlify" : "Vercel"}...`,
      "✅ Deployment completado exitosamente!", "📊 Timestamp: 20260102_030405",
    ].map(log).join(""))
  })
})

describe("existing deployment guards", () => {
  it("still rejects production outside main before running tools", () => {
    const result = runDeploy({ environment: "production", platform: "vercel", branch: "develop" })
    expect(result.status).toBe(1)
    expect(result.stdout).toBe("🚀 Iniciando deployment a production...\n" + error("Production solo puede deployarse desde la rama 'main'"))
    expect(result.stderr).toBe("")
    expect(result.calls).toEqual([])
    expect(result.built).toBe(false)
  })

  it("still rejects uncommitted changes before running tools", () => {
    const result = runDeploy({ environment: "staging", platform: "netlify", dirty: true })
    expect(result.status).toBe(1)
    expect(result.stdout).toBe("🚀 Iniciando deployment a staging...\n" + error("Hay cambios sin commitear. Commitea o descarta los cambios antes de deployar."))
    expect(result.stderr).toBe("")
    expect(result.calls).toEqual([])
    expect(result.built).toBe(false)
  })
})
