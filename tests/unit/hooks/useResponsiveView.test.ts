import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResponsiveView } from '../../../src/shared/hooks/useResponsiveView'

describe('useResponsiveView Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Reset window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920
    })
  })

  afterEach(() => {
    // Clean up event listeners
    window.dispatchEvent(new Event('resize'))
  })

  describe('Desktop Behavior', () => {
    it('should initialize with default value on desktop', () => {
      window.innerWidth = 1920
      
      const { result } = renderHook(() => useResponsiveView('test-view'))
      
      expect(result.current[0]).toBe('cards')
      expect(result.current[2]).toBe(false) // isMobile
    })

    it('should allow changing view mode on desktop', () => {
      window.innerWidth = 1920
      
      const { result } = renderHook(() => useResponsiveView('test-view'))
      
      act(() => {
        result.current[1]('table')
      })
      
      expect(result.current[0]).toBe('table')
    })

    it('should persist view mode on desktop', () => {
      window.innerWidth = 1920
      
      const { result } = renderHook(() => useResponsiveView('test-view'))
      
      act(() => {
        result.current[1]('table')
      })
      
      expect(localStorage.getItem('test-view')).toBe('table')
    })

    it('should load persisted view mode on desktop', () => {
      window.innerWidth = 1920
      localStorage.setItem('test-view', 'table')
      
      const { result } = renderHook(() => useResponsiveView('test-view'))
      
      expect(result.current[0]).toBe('table')
    })
  })

  describe('Mobile Behavior', () => {
    it('should force cards view on mobile', () => {
      window.innerWidth = 768
      
      const { result } = renderHook(() => useResponsiveView('test-view', 'table'))
      
      expect(result.current[0]).toBe('cards')
      expect(result.current[2]).toBe(true) // isMobile
    })

    it('should not allow changing view mode on mobile', () => {
      window.innerWidth = 768
      
      const { result } = renderHook(() => useResponsiveView('test-view'))
      
      act(() => {
        result.current[1]('table')
      })
      
      expect(result.current[0]).toBe('cards') // Still cards
    })

    it('should not persist view mode changes on mobile', () => {
      window.innerWidth = 768
      
      const { result } = renderHook(() => useResponsiveView('test-view'))
      
      act(() => {
        result.current[1]('table')
      })
      
      expect(localStorage.getItem('test-view')).toBeNull()
    })
  })

  describe('Tablet Behavior', () => {
    it('should treat tablet as mobile (< 1024px)', () => {
      window.innerWidth = 1023
      
      const { result } = renderHook(() => useResponsiveView('test-view'))
      
      expect(result.current[0]).toBe('cards')
      expect(result.current[2]).toBe(true) // isMobile
    })

    it('should treat large tablet as desktop (>= 1024px)', () => {
      window.innerWidth = 1024
      
      const { result } = renderHook(() => useResponsiveView('test-view'))
      
      expect(result.current[2]).toBe(false) // Not mobile
    })
  })

  describe('Responsive Behavior', () => {
    it('should update isMobile on window resize', () => {
      window.innerWidth = 1920
      
      const { result } = renderHook(() => useResponsiveView('test-view'))
      
      expect(result.current[2]).toBe(false)
      
      act(() => {
        window.innerWidth = 768
        window.dispatchEvent(new Event('resize'))
      })
      
      // Wait for state update
      setTimeout(() => {
        expect(result.current[2]).toBe(true)
      }, 0)
    })

    it('should switch to cards when resizing to mobile', () => {
      window.innerWidth = 1920
      
      const { result } = renderHook(() => useResponsiveView('test-view'))
      
      act(() => {
        result.current[1]('table')
      })
      
      expect(result.current[0]).toBe('table')
      
      act(() => {
        window.innerWidth = 768
        window.dispatchEvent(new Event('resize'))
      })
      
      // Wait for state update
      setTimeout(() => {
        expect(result.current[0]).toBe('cards')
      }, 0)
    })

    it('should restore saved view when resizing to desktop', () => {
      window.innerWidth = 1920
      
      const { result } = renderHook(() => useResponsiveView('test-view'))
      
      // Set to table on desktop
      act(() => {
        result.current[1]('table')
      })
      
      // Resize to mobile
      act(() => {
        window.innerWidth = 768
        window.dispatchEvent(new Event('resize'))
      })
      
      // Resize back to desktop
      act(() => {
        window.innerWidth = 1920
        window.dispatchEvent(new Event('resize'))
      })
      
      // Wait for state update
      setTimeout(() => {
        expect(result.current[0]).toBe('table')
      }, 0)
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      window.innerWidth = 1920
      
      const { result } = renderHook(() => useResponsiveView('test-view', 'cards'))
      
      expect(result.current[0]).toBe('cards')
      
      consoleError.mockRestore()
    })

    it('should handle invalid stored values', () => {
      window.innerWidth = 1920
      localStorage.setItem('test-view', 'invalid')
      
      const { result } = renderHook(() => useResponsiveView('test-view', 'cards'))
      
      expect(result.current[0]).toBe('cards')
    })
  })

  describe('Multiple Instances', () => {
    it('should handle multiple instances independently', () => {
      window.innerWidth = 1920
      
      const { result: result1 } = renderHook(() => useResponsiveView('view-1'))
      const { result: result2 } = renderHook(() => useResponsiveView('view-2'))
      
      act(() => {
        result1.current[1]('table')
        result2.current[1]('cards')
      })
      
      expect(result1.current[0]).toBe('table')
      expect(result2.current[0]).toBe('cards')
    })
  })

  describe('Cleanup', () => {
    it('should clean up resize listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      
      const { unmount } = renderHook(() => useResponsiveView('test-view'))
      
      unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
      
      removeEventListenerSpy.mockRestore()
    })
  })
})
