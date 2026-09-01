export type TrialDateState = "active" | "today" | "expired" | "invalid"

export const getTrialDateState = (endsAt: string, now = new Date()): TrialDateState => {
  const end = new Date(endsAt)
  const endTime = end.getTime()
  if (!Number.isFinite(endTime)) return "invalid"
  if (endTime <= now.getTime()) return "expired"
  if (
    end.getFullYear() === now.getFullYear()
    && end.getMonth() === now.getMonth()
    && end.getDate() === now.getDate()
  ) return "today"
  return "active"
}

export const getTrialDaysRemaining = (endsAt: string, now = new Date()): number => {
  const endTime = new Date(endsAt).getTime()
  if (!Number.isFinite(endTime)) return 0
  return Math.max(0, Math.ceil((endTime - now.getTime()) / 86_400_000))
}

export const formatTrialDate = (value: string, locale: string): string => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "—"
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date)
}
