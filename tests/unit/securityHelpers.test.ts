import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  RateLimiter,
  debounce,
  throttle,
  isValidOrigin,
  sanitizeForLogging,
  checkSecurityFeatures,
} from '../../src/utils/securityHelpers'

describe('Security Helpers', () => {
  describe('RateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter(3, 1000)
      expect(limiter.canMakeRequest('test')).toBe(true)
      expect(limiter.canMakeRequest('test')).toBe(true)
      expect(limiter.canMakeRequest('test')).toBe(true)
    })

    it('should block requests exceeding limit', () => {
      const limiter = new RateLimiter(2, 1000)
      limiter.canMakeRequest('test')
      limiter.canMakeRequest('test')
      expect(limiter.canMakeRequest('test')).toBe(false)
    })

    it('should reset specific key', () => {
      const limiter = new RateLimiter(1, 1000)
      limiter.canMakeRequest('test')
      limiter.reset('test')
      expect(limiter.canMakeRequest('test')).toBe(true)
    })

    it('should reset all keys', () => {
      const limiter = new RateLimiter(1, 1000)
      limiter.canMakeRequest('test1')
      limiter.canMakeRequest('test2')
      limiter.resetAll()
      expect(limiter.canMakeRequest('test1')).toBe(true)
      expect(limiter.canMakeRequest('test2')).toBe(true)
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('should delay function execution', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      debounced()
      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should cancel previous calls', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      debounced()
      debounced()
      debounced()

      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('should limit function execution', () => {
      const fn = vi.fn()
      const throttled = throttle(fn, 100)

      throttled()
      throttled()
      throttled()

      expect(fn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(100)
      throttled()
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('isValidOrigin', () => {
    it('should allow valid origins', () => {
      expect(isValidOrigin('https://leonix.net.ar')).toBe(true)
      expect(isValidOrigin('https://api.leonix.net.ar')).toBe(true)
    })

    it('should block invalid origins', () => {
      expect(isValidOrigin('https://evil.com')).toBe(false)
      expect(isValidOrigin('http://malicious.site')).toBe(false)
    })
  })

  describe('sanitizeForLogging', () => {
    it('should redact sensitive keys', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        token: 'abc123',
      }
      const result = sanitizeForLogging(obj)
      expect(result.username).toBe('john')
      expect(result.password).toBe('[REDACTED]')
      expect(result.token).toBe('[REDACTED]')
    })

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'john',
          apiKey: 'secret',
        },
      }
      const result = sanitizeForLogging(obj)
      expect(result.user.name).toBe('john')
      expect(result.user.apiKey).toBe('[REDACTED]')
    })

    it('should handle arrays', () => {
      const obj = {
        users: [
          { name: 'john', password: 'secret' },
          { name: 'jane', password: 'secret2' },
        ],
      }
      const result = sanitizeForLogging(obj)
      expect(result.users[0].password).toBe('[REDACTED]')
      expect(result.users[1].password).toBe('[REDACTED]')
    })
  })

  describe('checkSecurityFeatures', () => {
    it('should check for crypto support', () => {
      const features = checkSecurityFeatures()
      expect(features).toHaveProperty('crypto')
      expect(features).toHaveProperty('localStorage')
      expect(features).toHaveProperty('serviceWorker')
      expect(features).toHaveProperty('https')
    })
  })
})
