const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * Normalizes any date-like value (a Date instance or a string whose prefix is
 * an ISO calendar date) into a local `yyyy-mm-dd` string.
 *
 * Parsing is done by calendar parts instead of `new Date(isoString)` so the
 * result never shifts by a day in timezones behind UTC.
 * Returns an empty string when the value cannot be interpreted as a date.
 */
export const toISODateString = (value: unknown): string => {
	if (!value) return ""

	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return ""
		return buildLocalISO(
			value.getFullYear(),
			value.getMonth() + 1,
			value.getDate(),
		)
	}

	if (typeof value !== "string") return ""

	const match = value.match(ISO_DATE_PREFIX)
	if (match) return `${match[1]}-${match[2]}-${match[3]}`

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) return ""
	return buildLocalISO(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate())
}

/**
 * Formats any date-like value as `dd/mm/yyyy`.
 * Returns an empty string when the value is missing or invalid, so callers can
 * fall back to their own placeholder.
 */
export const formatDateValue = (value: unknown): string => {
	const iso = toISODateString(value)
	if (!iso) return ""
	const [year, month, day] = iso.split("-")
	return `${day}/${month}/${year}`
}

const buildLocalISO = (year: number, month: number, day: number): string =>
	`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
