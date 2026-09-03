import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const panelCssPath = path.resolve(__dirname, '../../../../src/features/tenants/styles/panelAdmin.module.css')
const homeCssPath = path.resolve(__dirname, '../../../../src/features/home/styles/home.module.css')
const tenantsDir = path.resolve(__dirname, '../../../../src/features/tenants')

function readFile(p: string) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '' }

describe('dashboard design system final (PR3)', () => {
  it('panelAdmin.module.css has no heavy shadows / gradients / forbidden literals (final)', () => {
    const css = readFile(panelCssPath)
    // final invariants: zero box-shadow literal at all, zero linear-gradient, zero !important, zero .dark, zero backdrop-filter, zero background-clip
    expect(css).not.toMatch(/box-shadow/)
    expect(css).not.toMatch(/backdrop-filter/)
    expect(css).not.toMatch(/background-clip\s*:\s*text/)
    expect(css).not.toMatch(/!important/)
    expect(css).not.toMatch(/\.dark\s+\./)
    expect(css).not.toMatch(/\.dark/)
    expect(css).not.toMatch(/linear-gradient/)
    // also no heavy specific still
    expect(css).not.toMatch(/box-shadow\s*:\s*0\s*4px\s*20px/)
    expect(css).not.toMatch(/box-shadow\s*:\s*0\s*8px\s*32px/)
  })

  it('no from "recharts" in features/tenants', () => {
    const walk = (dir: string): string[] => {
      const out: string[] = []
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const fp = path.join(dir, e.name)
        if (e.isDirectory()) out.push(...walk(fp))
        else if (e.isFile() && (fp.endsWith('.ts') || fp.endsWith('.tsx'))) out.push(fp)
      }
      return out
    }
    const allFiles = walk(tenantsDir)
    for (const f of allFiles) {
      const content = fs.readFileSync(f, 'utf-8')
      expect(content, `${f} should not import recharts`).not.toMatch(/from\s+["']recharts["']/)
    }
  })

  it('no console.log/error in PanelAdmin files (final)', () => {
    const panelAdminPath = path.resolve(__dirname, '../../../../src/pages/PanelAdmin.tsx')
    const hookPath = path.resolve(__dirname, '../../../../src/features/tenants/hooks/usePanelAdminDashboard.ts')
    const barPath = path.resolve(__dirname, '../../../../src/features/tenants/components/TenantBarChart.tsx')
    const linePath = path.resolve(__dirname, '../../../../src/features/tenants/components/TenantLineChart.tsx')
    const recentPath = path.resolve(__dirname, '../../../../src/features/tenants/components/RecentTenants.tsx')
    const skeletonPath = path.resolve(__dirname, '../../../../src/features/tenants/components/PanelSkeleton.tsx')
    for (const p of [panelAdminPath, hookPath, barPath, linePath, recentPath, skeletonPath]) {
      if (!fs.existsSync(p)) continue
      const c = fs.readFileSync(p, 'utf-8')
      expect(c, `${p} console.log`).not.toMatch(/console\.log/)
      expect(c, `${p} console.error`).not.toMatch(/console\.error/)
    }
  })

  it('no tailwindcss / tailwind.config.* / @tailwind', () => {
    const pkgPath = path.resolve(__dirname, '../../../../package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    expect(deps['tailwindcss']).toBeUndefined()
    expect(deps['recharts'] === undefined || typeof deps['recharts'] === 'string').toBeTruthy()
    // ensure recharts not newly added in tenants diff — already checked above
    expect(fs.existsSync(path.resolve(__dirname, '../../../../tailwind.config.js'))).toBe(false)
    expect(fs.existsSync(path.resolve(__dirname, '../../../../tailwind.config.ts'))).toBe(false)
    const indexCss = readFile(path.resolve(__dirname, '../../../../src/index.css'))
    expect(indexCss).not.toMatch(/@tailwind/)
  })

  it('no fill var SVG hazard in tenants', () => {
    const walk = (dir: string): string[] => {
      const out: string[] = []
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const fp = path.join(dir, e.name)
        if (e.isDirectory()) out.push(...walk(fp))
        else if (e.isFile() && (fp.endsWith('.ts') || fp.endsWith('.tsx'))) out.push(fp)
      }
      return out
    }
    for (const f of walk(tenantsDir)) {
      const c = fs.readFileSync(f, 'utf-8')
      expect(c, `${f} fill var`).not.toMatch(/fill="var\(/)
    }
  })
})
