import { describe, expect, it } from 'vitest'
import { formatDateValue, toISODateString } from '../../../src/shared/utils/dateDisplay'

describe('toISODateString', () => {
	it('keeps an already ISO date string untouched', () => {
		expect(toISODateString('2026-08-24')).toBe('2026-08-24')
	})

	it('extracts the calendar part from a full ISO timestamp', () => {
		expect(toISODateString('2026-08-24T03:00:00.000Z')).toBe('2026-08-24')
	})

	it('converts a Date instance using local calendar parts', () => {
		expect(toISODateString(new Date(2026, 7, 24))).toBe('2026-08-24')
	})

	it('returns empty for missing or invalid values', () => {
		expect(toISODateString(undefined)).toBe('')
		expect(toISODateString(null)).toBe('')
		expect(toISODateString('')).toBe('')
		expect(toISODateString('not-a-date')).toBe('')
		expect(toISODateString(new Date('invalid'))).toBe('')
	})
})

describe('formatDateValue', () => {
	it('formats ISO dates and timestamps as dd/mm/yyyy', () => {
		expect(formatDateValue('2026-08-24')).toBe('24/08/2026')
		expect(formatDateValue('2026-08-24T03:00:00.000Z')).toBe('24/08/2026')
	})

	it('formats Date instances as dd/mm/yyyy', () => {
		expect(formatDateValue(new Date(2026, 0, 5))).toBe('05/01/2026')
	})

	it('falls back to empty string so callers can show their placeholder', () => {
		expect(formatDateValue('')).toBe('')
		expect(formatDateValue('garbage')).toBe('')
	})
})
