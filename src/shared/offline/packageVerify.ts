/**
 * R3 — Package manifest verification: signature, schema, binding, expiry.
 * Fail-closed: unknown kid, bad signature, expired, binding mismatch all reject.
 */
import { importVerificationKey, verifyCanonicalSignature, type VerificationKey } from './crypto'
import type { OfflineManifest, OfflineManifestClaim, OfflineManifestSignature } from './packageTypes'
import { PACKAGE_SCHEMA_VERSION, PACKAGE_LEASE_MAX_MS } from './packageTypes'

export type ManifestVerifyStatus =
  | 'valid' | 'malformed' | 'invalid_schema_version' | 'no_verification_keys'
  | 'unknown_kid' | 'invalid_signature' | 'binding_mismatch' | 'expired' | 'lease_too_long'

export interface ManifestVerifyResult { ok: boolean; status: ManifestVerifyStatus }

/**
 * Verify a manifest against a trusted key set.
 * Extracts signature, verifies canonical claims, checks schema/binding/expiry.
 */
export async function verifyManifest(
  manifest: OfflineManifest,
  keySet: VerificationKey[],
  expectedBinding: { tenantId: string; userId: string; deviceId: string },
  nowMs: number = Date.now(),
): Promise<ManifestVerifyResult> {
  if (!manifest || typeof manifest !== 'object') return { ok: false, status: 'malformed' }
  if (!manifest.signature) return { ok: false, status: 'malformed' }
  if (manifest.schemaVersion !== PACKAGE_SCHEMA_VERSION) return { ok: false, status: 'invalid_schema_version' }
  if (!keySet.length) return { ok: false, status: 'no_verification_keys' }

  const sig = manifest.signature
  if (sig.alg !== 'ES256' || typeof sig.kid !== 'string' || typeof sig.value !== 'string') return { ok: false, status: 'malformed' }

  const key = keySet.find(k => k.kid === sig.kid)
  if (!key) return { ok: false, status: 'unknown_kid' }

  const pubKey = await importVerificationKey(key).catch(() => null)
  if (!pubKey) return { ok: false, status: 'unknown_kid' }

  // Signature covers claims WITHOUT the signature field
  const { signature: _sig, ...claims } = manifest
  const valid = await verifyCanonicalSignature(claims, sig.value, pubKey).catch(() => false)
  if (!valid) return { ok: false, status: 'invalid_signature' }

  // Binding check
  if (manifest.binding?.tenantId !== expectedBinding.tenantId
    || manifest.binding?.userId !== expectedBinding.userId
    || manifest.binding?.deviceId !== expectedBinding.deviceId) {
    return { ok: false, status: 'binding_mismatch' }
  }

  // Expiry
  const expires = new Date(manifest.expiresAt).getTime()
  if (isNaN(expires) || nowMs > expires) return { ok: false, status: 'expired' }

  // Lease duration sanity
  const issued = new Date(manifest.serverTime).getTime()
  if (!isNaN(issued) && (expires - issued) > PACKAGE_LEASE_MAX_MS + 60000) return { ok: false, status: 'lease_too_long' }

  return { ok: true, status: 'valid' }
}
