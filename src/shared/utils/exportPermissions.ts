export const canExportOperationalResults = (role: string | null): boolean => {
  const normalized = role?.toLowerCase()
  return normalized === "admin" || normalized === "super_admin" || normalized === "tecnico" || normalized === "técnico"
}
