import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatRelativeTime } from '../../../src/shared/utils/formatRelativeTime'

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-16T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should format minutes as minutes', () => {
    expect(formatRelativeTime(new Date('2026-05-16T11:42:00Z'), 'es', 'ahora')).toBe('hace 18 minutos')
  })

  it('should format more than 60 minutes as hours', () => {
    expect(formatRelativeTime(new Date('2026-05-16T10:00:00Z'), 'es', 'ahora')).toBe('hace 2 horas')
  })

  it('should format old dates as days, months, or years', () => {
    expect(formatRelativeTime(new Date('2026-05-13T12:00:00Z'), 'es', 'ahora')).toBe('hace 3 días')
    expect(formatRelativeTime(new Date('2026-03-16T12:00:00Z'), 'es', 'ahora')).toBe('hace 2 meses')
    expect(formatRelativeTime(new Date('2024-05-16T12:00:00Z'), 'es', 'ahora')).toBe('hace 2 años')
  })
})
