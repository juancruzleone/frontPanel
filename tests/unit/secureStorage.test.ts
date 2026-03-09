import { describe, it, expect, beforeEach, vi } from 'vitest'
import { secureStorage } from '../../src/services/secureStorage'

describe('SecureStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      secureStorage.set('test', 'value')
      expect(secureStorage.get('test')).toBe('value')
    })

    it('should handle objects', () => {
      const obj = { name: 'John', age: 30 }
      secureStorage.set('user', obj)
      expect(secureStorage.get('user')).toEqual(obj)
    })

    it('should return null for non-existent keys', () => {
      expect(secureStorage.get('nonexistent')).toBeNull()
    })
  })

  describe('expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('should expire items after expiresIn', () => {
      secureStorage.set('test', 'value', { expiresIn: 1000 })
      expect(secureStorage.get('test')).toBe('value')

      vi.advanceTimersByTime(1001)
      expect(secureStorage.get('test')).toBeNull()
    })

    it('should not expire items without expiresIn', () => {
      secureStorage.set('test', 'value')
      vi.advanceTimersByTime(10000)
      expect(secureStorage.get('test')).toBe('value')
    })
  })

  describe('remove', () => {
    it('should remove items', () => {
      secureStorage.set('test', 'value')
      secureStorage.remove('test')
      expect(secureStorage.get('test')).toBeNull()
    })
  })

  describe('clear', () => {
    it('should clear all items with prefix', () => {
      secureStorage.set('test1', 'value1')
      secureStorage.set('test2', 'value2')
      secureStorage.clear()
      expect(secureStorage.get('test1')).toBeNull()
      expect(secureStorage.get('test2')).toBeNull()
    })
  })

  describe('has', () => {
    it('should check if item exists', () => {
      secureStorage.set('test', 'value')
      expect(secureStorage.has('test')).toBe(true)
      expect(secureStorage.has('nonexistent')).toBe(false)
    })
  })

  describe('token methods', () => {
    it('should store and retrieve tokens', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      secureStorage.setToken(token)
      expect(secureStorage.getToken()).toBe(token)
    })

    it('should reject invalid JWT format', () => {
      const result = secureStorage.setToken('invalid-token')
      expect(result).toBe(false)
    })

    it('should remove tokens', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      secureStorage.setToken(token)
      secureStorage.removeToken()
      expect(secureStorage.getToken()).toBeNull()
    })
  })

  describe('clearSensitiveData', () => {
    it('should clear sensitive data', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      secureStorage.setToken(token)
      secureStorage.set('user_session', 'session123')
      secureStorage.set('normal_data', 'keep this')

      secureStorage.clearSensitiveData()

      expect(secureStorage.getToken()).toBeNull()
      expect(secureStorage.get('user_session')).toBeNull()
      expect(secureStorage.get('normal_data')).toBe('keep this')
    })
  })

  describe('isAvailable', () => {
    it('should check if storage is available', () => {
      expect(secureStorage.isAvailable()).toBe(true)
    })
  })

  describe('cleanExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('should clean expired items', () => {
      secureStorage.set('expired', 'value', { expiresIn: 1000 })
      secureStorage.set('valid', 'value', { expiresIn: 10000 })

      vi.advanceTimersByTime(1001)
      secureStorage.cleanExpired()

      expect(secureStorage.get('expired')).toBeNull()
      expect(secureStorage.get('valid')).toBe('value')
    })
  })
})
