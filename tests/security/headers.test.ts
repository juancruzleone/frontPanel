import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8')

const parseNetlifyHeaders = (source: string): Map<string, Map<string, string>> => {
  const sections = new Map<string, Map<string, string>>()
  let current: Map<string, string> | undefined
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('/')) {
      current = new Map()
      sections.set(line, current)
      continue
    }
    const separator = line.indexOf(':')
    if (current && separator > 0) {
      current.set(line.slice(0, separator), line.slice(separator + 1).trim())
    }
  }
  return sections
}

describe('deployed security header configuration', () => {
  const headers = parseNetlifyHeaders(readProjectFile('public/_headers'))
  const globalHeaders = headers.get('/*')

  it('defines browser hardening on the actual global deployment rule', () => {
    expect(globalHeaders?.get('X-Frame-Options')).toBe('DENY')
    expect(globalHeaders?.get('X-Content-Type-Options')).toBe('nosniff')
    expect(globalHeaders?.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(globalHeaders?.get('Permissions-Policy')).toContain('camera=()')
    expect(globalHeaders?.get('Strict-Transport-Security')).toMatch(/max-age=31536000.*includeSubDomains/)
  })

  it('delivers the effective CSP as a response header rather than an HTML meta policy', () => {
    const csp = globalHeaders?.get('Content-Security-Policy')
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(readProjectFile('index.html')).not.toContain('http-equiv="Content-Security-Policy"')
  })

  it('configures sensitive entry points as non-cacheable', () => {
    expect(headers.get('/index.html')?.get('Cache-Control')).toContain('no-store')
    expect(headers.get('/sw.js')?.get('Cache-Control')).toContain('no-store')
    expect(headers.get('/api/*')?.get('Cache-Control')).toContain('no-store')
  })

  it('keeps the checked-in Netlify configuration aligned with cross-origin isolation headers', () => {
    const netlifyToml = readProjectFile('netlify.toml')
    expect(netlifyToml).toContain('Cross-Origin-Embedder-Policy = "require-corp"')
    expect(netlifyToml).toContain('Cross-Origin-Opener-Policy = "same-origin"')
    expect(netlifyToml).toContain('Cross-Origin-Resource-Policy = "same-site"')
  })
})
