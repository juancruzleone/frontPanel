import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  sanitizeUrl,
  sanitizeInput,
  sanitizeObject,
  sanitizePath,
  sanitizeFilename,
  isValidEmail,
  isValidUrl,
  isValidJWT,
} from '../../src/utils/sanitizer'

describe('Sanitizer Utils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>'
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      expect(escapeHtml(input)).toBe(expected)
    })

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
    })

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('')
    })
  })

  describe('sanitizeUrl', () => {
    it('should allow https URLs', () => {
      const url = 'https://example.com'
      expect(sanitizeUrl(url)).toBe(url + '/')
    })

    it('should block javascript: protocol', () => {
      const url = 'javascript:alert("xss")'
      expect(sanitizeUrl(url)).toBe('about:blank')
    })

    it('should block data:text/html', () => {
      const url = 'data:text/html,<script>alert("xss")</script>'
      expect(sanitizeUrl(url)).toBe('about:blank')
    })

    it('should block vbscript: protocol', () => {
      const url = 'vbscript:msgbox("xss")'
      expect(sanitizeUrl(url)).toBe('about:blank')
    })
  })

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World'
      const result = sanitizeInput(input)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('</script>')
    })

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>'
      const result = sanitizeInput(input)
      expect(result).not.toContain('<iframe>')
    })

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(\'xss\')">Click me</div>'
      const result = sanitizeInput(input)
      expect(result).not.toContain('onclick=')
    })

    it('should trim whitespace', () => {
      const input = '  hello  '
      expect(sanitizeInput(input)).toBe('hello')
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize string values', () => {
      const obj = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
      }
      const result = sanitizeObject(obj)
      expect(result.name).not.toContain('<script>')
      expect(result.email).toBe('test@example.com')
    })

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: '<script>xss</script>',
        },
      }
      const result = sanitizeObject(obj)
      expect(result.user.name).not.toContain('<script>')
    })

    it('should handle arrays', () => {
      const obj = {
        tags: ['<script>xss</script>', 'safe'],
      }
      const result = sanitizeObject(obj)
      expect(result.tags[0]).not.toContain('<script>')
      expect(result.tags[1]).toBe('safe')
    })
  })

  describe('sanitizePath', () => {
    it('should remove path traversal attempts', () => {
      const path = '../../../etc/passwd'
      const result = sanitizePath(path)
      expect(result).not.toContain('..')
    })

    it('should remove invalid characters', () => {
      const path = 'file<>:"|?*.txt'
      const result = sanitizePath(path)
      expect(result).not.toMatch(/[<>:"|?*]/)
    })

    it('should remove leading slashes', () => {
      const path = '///path/to/file'
      const result = sanitizePath(path)
      expect(result).not.toMatch(/^\//)
    })
  })

  describe('sanitizeFilename', () => {
    it('should allow safe characters', () => {
      const filename = 'my-file_123.txt'
      expect(sanitizeFilename(filename)).toBe(filename)
    })

    it('should replace unsafe characters with underscore', () => {
      const filename = 'my file!@#$.txt'
      const result = sanitizeFilename(filename)
      expect(result).toMatch(/^[a-zA-Z0-9._-]+$/)
    })

    it('should limit filename length', () => {
      const filename = 'a'.repeat(300) + '.txt'
      const result = sanitizeFilename(filename)
      expect(result.length).toBeLessThanOrEqual(255)
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://localhost:3000')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false)
      expect(isValidUrl('javascript:alert(1)')).toBe(false)
    })
  })

  describe('isValidJWT', () => {
    it('should validate JWT format', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      expect(isValidJWT(validJWT)).toBe(true)
    })

    it('should reject invalid JWT format', () => {
      expect(isValidJWT('not.a.jwt')).toBe(false)
      expect(isValidJWT('invalid')).toBe(false)
    })
  })
})
