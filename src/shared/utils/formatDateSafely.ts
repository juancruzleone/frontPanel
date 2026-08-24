export const formatDateSafely = (
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
  fallback: string,
): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  return new Intl.DateTimeFormat(locale, options).format(date)
}
