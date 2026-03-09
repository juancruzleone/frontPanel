import { describe, it, expect } from 'vitest'
import { sanitizeInput, escapeHtml, sanitizeUrl } from '../../src/utils/sanitizer'

describe('XSS Protection Tests', () => {
  describe('Script Injection Prevention', () => {
    it('should block <script> tags', () => {
      const malicious = '<script>alert("XSS")</script>'
      const sanitized = sanitizeInput(malicious)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('</script>')
    })

    it('should block inline event handlers', () => {
      const malicious = '<img src=x onerror="alert(\'XSS\')">'
      const sanitized = sanitizeInput(malicious)
      expect(sanitized).not.toContain('onerror=')
    })

    it('should block javascript: protocol', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">Click</a>'
      const sanitized = sanitizeInput(malicious)
      expect(sanitized).not.toContain('javascript:')
    })

    it('should block data: URIs with HTML', () => {
      const malicious = 'data:text/html,<script>alert("XSS")</script>'
      const sanitized = sanitizeUrl(malicious)
      expect(sanitized).toBe('about:blank')
    })
  })

  describe('HTML Entity Encoding', () => {
    it('should encode < and >', () => {
      const input = '<div>content</div>'
      const encoded = escapeHtml(input)
      expect(encoded).toContain('&lt;')
      expect(encoded).toContain('&gt;')
    })

    it('should encode quotes', () => {
      const input = '"quoted" and \'single\''
      const encoded = escapeHtml(input)
      expect(encoded).toContain('&quot;')
      expect(encoded).toContain('&#x27;')
    })

    it('should encode ampersands', () => {
      const input = 'Tom & Jerry'
      const encoded = escapeHtml(input)
      expect(encoded).toContain('&amp;')
    })
  })

  describe('DOM-based XSS Prevention', () => {
    it('should sanitize user input before DOM insertion', () => {
      const userInput = '<img src=x onerror=alert(1)>'
      const sanitized = sanitizeInput(userInput)
      
      // Verificar que no contiene código ejecutable
      expect(sanitized).not.toMatch(/onerror\s*=/i)
      expect(sanitized).not.toMatch(/onclick\s*=/i)
      expect(sanitized).not.toMatch(/onload\s*=/i)
    })

    it('should handle encoded attacks', () => {
      const encoded = '&lt;script&gt;alert(1)&lt;/script&gt;'
      const sanitized = sanitizeInput(encoded)
      // Debe mantener los entities pero no ejecutar
      expect(sanitized).not.toContain('<script>')
    })
  })

  describe('SVG-based XSS Prevention', () => {
    it('should block SVG with embedded scripts', () => {
      const malicious = '<svg onload="alert(1)">'
      const sanitized = sanitizeInput(malicious)
      expect(sanitized).not.toContain('onload=')
    })
  })

  describe('CSS Injection Prevention', () => {
    it('should block style tags with javascript', () => {
      const malicious = '<style>body{background:url("javascript:alert(1)")}</style>'
      const sanitized = sanitizeInput(malicious)
      expect(sanitized).not.toContain('javascript:')
    })
  })

  describe('Attribute Injection Prevention', () => {
    it('should block malicious attributes', () => {
      const attacks = [
        '<div onclick="alert(1)">',
        '<img onerror="alert(1)">',
        '<body onload="alert(1)">',
        '<input onfocus="alert(1)">',
      ]

      attacks.forEach(attack => {
        const sanitized = sanitizeInput(attack)
        expect(sanitized).not.toMatch(/on\w+\s*=/i)
      })
    })
  })

  describe('Protocol Handler XSS', () => {
    it('should block dangerous protocols', () => {
      const protocols = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
      ]

      protocols.forEach(protocol => {
        const sanitized = sanitizeUrl(protocol)
        expect(sanitized).toBe('about:blank')
      })
    })
  })

  describe('Mutation XSS Prevention', () => {
    it('should handle nested tags', () => {
      const malicious = '<<script>script>alert(1)<</script>/script>'
      const sanitized = sanitizeInput(malicious)
      expect(sanitized).not.toContain('<script>')
    })

    it('should handle case variations', () => {
      const variations = [
        '<SCRIPT>alert(1)</SCRIPT>',
        '<ScRiPt>alert(1)</ScRiPt>',
        '<script >alert(1)</script>',
      ]

      variations.forEach(variation => {
        const sanitized = sanitizeInput(variation)
        expect(sanitized.toLowerCase()).not.toContain('<script')
      })
    })
  })
})
