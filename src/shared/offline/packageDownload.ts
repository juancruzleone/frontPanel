/**
 * R4/R5 — Package download orchestration: trust → prepare → verify → seal → persist.
 * Callable service boundary for UI. No side effects until all verification passes.
 */
import { useOfflineTrustStore } from '@/store/offlineTrustStore'
import { fetchVerificationKeys } from './leaseGate'
import { preparePackage } from './packageService'
import { verifyManifest } from './packageVerify'
import { sealAndPersistBootstrap, type SealResult } from './packageStorage'
import { checkPackageReadiness } from './packageReadiness'
import { generateStorageKey, sha256Hex, canonicalJSON } from './crypto'
import type { OfflineBootstrap, OfflineManifest } from './packageTypes'

export type DownloadStatus = 'success' | 'no_trust' | 'prepare_failed' | 'verify_failed'
  | 'checksum_failed' | 'not_ready' | 'seal_failed' | 'network_error'

export interface DownloadResult {
  status: DownloadStatus
  packageId?: string
  missingForms?: string[]
  error?: string
}

/**
 * Download, verify, seal, and persist a package for offline use.
 * Gate: requires valid trust state (device registered + lease valid).
 * Verification: manifest signature + binding + expiry + resource checksums.
 * Readiness: all required forms delivered (no FORM_NOT_DELIVERED).
 * Activation: sealed atomically — incomplete/tampered never replaces last ready.
 */
export async function downloadPackage(orderId?: string): Promise<DownloadResult> {
  // 1. Trust gate
  const trust = useOfflineTrustStore.getState()
  if (!trust.isOfflineReady || !trust.deviceId) return { status: 'no_trust', error: 'Device not registered or lease invalid' }
  const deviceId = trust.deviceId

  // 2. Prepare
  const prep = await preparePackage(deviceId, orderId)
  if (prep.error) return { status: 'prepare_failed', error: `${prep.error.code}: ${prep.error.message}` }
  const bootstrap = prep.bootstrap!
  const manifest = bootstrap.manifest

  // 3. Fetch verification keys
  const keysResult = await fetchVerificationKeys()
  if (keysResult.error || !keysResult.keys?.length) return { status: 'verify_failed', error: keysResult.error?.code ?? 'NO_VERIFICATION_KEYS' }

  // 4. Verify manifest (signature + binding + expiry)
  const binding = { tenantId: manifest.binding.tenantId, userId: manifest.binding.userId, deviceId }
  const vfy = await verifyManifest(manifest, keysResult.keys, binding)
  if (!vfy.ok) return { status: 'verify_failed', error: vfy.status }

  // 5. Verify resource checksums
  const checksumResult = await verifyResourceChecksums(bootstrap, manifest)
  if (!checksumResult.ok) return { status: 'checksum_failed', error: checksumResult.error }

  // 6. Readiness check (all required forms delivered)
  const readiness = checkPackageReadiness(manifest)
  if (!readiness.ready) return { status: 'not_ready', missingForms: readiness.missingForms, error: readiness.reason }

  // 7. Seal + persist atomically
  const key = await generateStorageKey()
  const sealResult: SealResult = await sealAndPersistBootstrap({
    bootstrap, key, kid: manifest.signature.kid,
    tenantId: binding.tenantId, userId: binding.userId, deviceId,
  })
  if (sealResult.error) return { status: 'seal_failed', error: sealResult.error.code }

  return { status: 'success', packageId: manifest.packageId }
}

// ── Resource checksum verification ──────────────────────────────────────

interface ChecksumResult { ok: boolean; error?: string }

/**
 * Verify resource checksums against manifest.resourceChecksums.
 * Each resource kind's items must match the signed checksums.
 * Uses SHA-256 of canonicalJSON (same algorithm as backend computeChecksum).
 */
export async function verifyResourceChecksums(bootstrap: OfflineBootstrap, manifest: OfflineManifest): Promise<ChecksumResult> {
  const kinds = ['workOrders', 'installations', 'assets', 'forms', 'inventoryRefs', 'documents'] as const

  for (const kind of kinds) {
    const expected = manifest.resourceChecksums[kind]
    if (!expected) continue // kind not in manifest — skip

    const items = bootstrap[kind]
    if (!Array.isArray(items)) {
      if (expected.length > 0) return { ok: false, error: `Missing resource array: ${kind}` }
      continue
    }

    if (items.length !== expected.length) return { ok: false, error: `Count mismatch: ${kind} (${items.length} vs ${expected.length})` }

    for (let i = 0; i < items.length; i++) {
      const computed = await sha256Hex(new TextEncoder().encode(canonicalJSON(items[i])))
      if (computed !== expected[i]) return { ok: false, error: `Checksum mismatch: ${kind}[${i}]` }
    }
  }

  return { ok: true }
}
