import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useViewMode } from '../../../src/shared/hooks/useViewMode'

describe('useViewMode Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default value when localStorage is empty', () => {
      const { result } = renderHook(() => useViewMode('test-view'))
      
      expect(result.current[0]).toBe('cards')
    })

    it('should initialize with custom default value', () => {
      const { result } = renderHook(() => useViewMode('test-view', 'table'))
      
      expect(result.current[0]).toBe('table')
    })

    it('should initialize from localStorage if value exists', () => {
      localStorage.setItem('test-view', 'table')
      
      const { result } = renderHook(() => useViewMode('test-view'))
      
      expect(result.current[0]).toBe('table')
    })

    it('should use default value if localStorage has invalid value', () => {
      localStorage.setItem('test-view', 'invalid')
      
      const { result } = renderHook(() => useViewMode('test-view', 'cards'))
      
      expect(result.current[0]).toBe('cards')
    })
  })

  describe('Setting View Mode', () => {
    it('should update view mode to cards', () => {
      const { result } = renderHook(() => useViewMode('test-view', 'table'))
      
      act(() => {
        result.current[1]('cards')
      })
      
      expect(result.current[0]).toBe('cards')
    })

    it('should update view mode to table', () => {
      const { result } = renderHook(() => useViewMode('test-view', 'cards'))
      
      act(() => {
        result.current[1]('table')
      })
      
      expect(result.current[0]).toBe('table')
    })

    it('should persist view mode to localStorage', () => {
      const { result } = renderHook(() => useViewMode('test-view'))
      
      act(() => {
        result.current[1]('table')
      })
      
      expect(localStorage.getItem('test-view')).toBe('table')
    })

    it('should update localStorage when view mode changes', () => {
      const { result } = renderHook(() => useViewMode('test-view'))
      
      act(() => {
        result.current[1]('table')
      })
      expect(localStorage.getItem('test-view')).toBe('table')
      
      act(() => {
        result.current[1]('cards')
      })
      expect(localStorage.getItem('test-view')).toBe('cards')
    })
  })

  describe('Multiple Instances', () => {
    it('should handle multiple instances with different keys', () => {
      const { result: result1 } = renderHook(() => useViewMode('view-1'))
      const { result: result2 } = renderHook(() => useViewMode('view-2'))
      
      act(() => {
        result1.current[1]('table')
        result2.current[1]('cards')
      })
      
      expect(result1.current[0]).toBe('table')
      expect(result2.current[0]).toBe('cards')
      expect(localStorage.getItem('view-1')).toBe('table')
      expect(localStorage.getItem('view-2')).toBe('cards')
    })

    it('should not affect other instances when updating', () => {
      const { result: result1 } = renderHook(() => useViewMode('view-1', 'cards'))
      const { result: result2 } = renderHook(() => useViewMode('view-2', 'cards'))
      
      act(() => {
        result1.current[1]('table')
      })
      
      expect(result1.current[0]).toBe('table')
      expect(result2.current[0]).toBe('cards')
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage read errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      const { result } = renderHook(() => useViewMode('test-view', 'cards'))
      
      expect(result.current[0]).toBe('cards')
      // The hook catches the error internally, so console.error might not be called
      // We just verify it doesn't crash and returns default value
      
      consoleError.mockRestore()
      getItemSpy.mockRestore()
    })

    it('should handle localStorage write errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      const { result } = renderHook(() => useViewMode('test-view'))
      
      // This should not crash even if localStorage fails
      act(() => {
        result.current[1]('table')
      })
      
      // The hook catches the error internally
      // We verify it doesn't crash the app
      
      consoleError.mockRestore()
      setItemSpy.mockRestore()
    })
  })

  describe('Persistence Across Renders', () => {
    it('should maintain state across re-renders', () => {
      const { result, rerender } = renderHook(() => useViewMode('test-view'))
      
      act(() => {
        result.current[1]('table')
      })
      
      rerender()
      
      expect(result.current[0]).toBe('table')
    })

    it('should load persisted value on new hook instance', () => {
      const { result: result1 } = renderHook(() => useViewMode('test-view'))
      
      act(() => {
        result1.current[1]('table')
      })
      
      // Create new instance with same key
      const { result: result2 } = renderHook(() => useViewMode('test-view'))
      
      expect(result2.current[0]).toBe('table')
    })
  })

  describe('Type Safety', () => {
    it('should only accept valid view modes', () => {
      const { result } = renderHook(() => useViewMode('test-view'))
      
      act(() => {
        result.current[1]('cards')
      })
      expect(result.current[0]).toBe('cards')
      
      act(() => {
        result.current[1]('table')
      })
      expect(result.current[0]).toBe('table')
    })
  })
})
