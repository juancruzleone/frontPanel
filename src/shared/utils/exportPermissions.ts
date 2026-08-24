/**
 * CSV export and template authorization helpers.
 *
 * Semantics mirror the backend route middlewares exactly:
 * - Entity CSV exports (activos, inventario, proveedores, work order and
 *   installation exports) are gated by `isAdminOrTechnician`:
 *   admin | super_admin | tecnico | técnico.
 * - CSV template downloads and import commits
 *   (csv/template, csv/import/commit routes) are gated by `isAdmin`:
 *   admin | super_admin.
 */
export const EXPORT_ALLOWED_ROLES = new Set(["admin", "super_admin", "tecnico", "técnico"])
export const TEMPLATE_ALLOWED_ROLES = new Set(["admin", "super_admin"])

const normalizeRole = (role: string | null | undefined): string => role?.trim().toLowerCase() ?? ""

export const canExportOperationalResults = (role: string | null): boolean =>
  EXPORT_ALLOWED_ROLES.has(normalizeRole(role))

/** Alias kept for entity CSV exports so call sites read consistently with the backend. */
export const canExportCsv = canExportOperationalResults

export const canDownloadCsvTemplate = (role: string | null): boolean =>
  TEMPLATE_ALLOWED_ROLES.has(normalizeRole(role))
