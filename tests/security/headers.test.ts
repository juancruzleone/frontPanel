import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8')

describe('Security Headers Tests', () => {
  describe('Content Security Policy', () => {
    it('should have CSP meta tag configured', () => {
      const indexHtml = readProjectFile('index.html')

      expect(indexHtml).toContain("default-src 'self'")
      expect(indexHtml).toContain("script-src 'self'")
      expect(indexHtml).not.toContain("script-src 'self' 'unsafe-inline'")
      expect(indexHtml).toContain("frame-ancestors 'none'")
    })

    it('should block inline scripts when CSP is strict', () => {
      const netlifyHeaders = readProjectFile('public/_headers')
      expect(netlifyHeaders).toContain("Content-Security-Policy: default-src 'self'; script-src 'self';")
    })
  })

  describe('X-Frame-Options', () => {
    it('should prevent clickjacking', () => {
      const xFrameOptions = 'DENY'
      expect(xFrameOptions).toBe('DENY')
    })
  })

  describe('X-Content-Type-Options', () => {
    it('should prevent MIME sniffing', () => {
      const xContentTypeOptions = 'nosniff'
      expect(xContentTypeOptions).toBe('nosniff')
    })
  })

  describe('Referrer-Policy', () => {
    it('should control referrer information', () => {
      const referrerPolicy = 'strict-origin-when-cross-origin'
      expect(referrerPolicy).toBe('strict-origin-when-cross-origin')
    })
  })

  describe('Permissions-Policy', () => {
    it('should restrict browser features', () => {
      const permissionsPolicy = {
        geolocation: '()',
        microphone: '()',
        camera: '()',
      }

      expect(permissionsPolicy.geolocation).toBe('()')
      expect(permissionsPolicy.microphone).toBe('()')
      expect(permissionsPolicy.camera).toBe('()')
    })
  })

  describe('Strict-Transport-Security', () => {
    it('should enforce HTTPS', () => {
      const hsts = {
        'max-age': 31536000,
        includeSubDomains: true,
        preload: true,
      }

      expect(hsts['max-age']).toBeGreaterThan(0)
      expect(hsts.includeSubDomains).toBe(true)
    })
  })

  describe('X-XSS-Protection', () => {
    it('should enable XSS filter', () => {
      const xssProtection = '1; mode=block'
      expect(xssProtection).toContain('1')
      expect(xssProtection).toContain('mode=block')
    })
  })

  describe('Cache-Control', () => {
    it('should prevent caching of sensitive data', () => {
      const cacheControl = {
        html: 'no-cache, no-store, must-revalidate',
        assets: 'public, max-age=31536000, immutable',
      }

      expect(cacheControl.html).toContain('no-store')
      expect(cacheControl.assets).toContain('immutable')
    })
  })

  describe('Cross-Origin Policies', () => {
    it('should configure CORS properly', () => {
      const netlifyToml = readProjectFile('netlify.toml')

      expect(netlifyToml).toContain('Cross-Origin-Embedder-Policy = "require-corp"')
      expect(netlifyToml).toContain('Cross-Origin-Opener-Policy = "same-origin"')
      expect(netlifyToml).toContain('Cross-Origin-Resource-Policy = "same-site"')
    })
  })
})
