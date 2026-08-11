/**
 * R5 — Package readiness: verify completeness before activation.
 * Pure function — no side effects, no network.
 */
import type { OfflineManifest, OfflineFormCompleteness } from './packageTypes'

export interface ReadinessResult { ready: boolean; missingForms: string[]; reason?: string }

/**
 * Check if a package is ready for offline use.
 * All required forms must be delivered (no FORM_NOT_DELIVERED).
 * Returns detailed missing-form list for UI display.
 */
export function checkPackageReadiness(manifest: OfflineManifest): ReadinessResult {
  if (!manifest?.completeness) return { ready: false, missingForms: [], reason: 'No completeness data' }

  const missingForms: string[] = []

  for (const [templateId, entry] of Object.entries(manifest.completeness)) {
    const form = entry as OfflineFormCompleteness
    if (!form.available) {
      missingForms.push(form.reason === 'FORM_NOT_DELIVERED' ? templateId : `${templateId}:${form.reason ?? 'unavailable'}`)
    }
  }

  if (missingForms.length > 0) return { ready: false, missingForms, reason: 'FORM_NOT_DELIVERED' }
  return { ready: true, missingForms: [] }
}
