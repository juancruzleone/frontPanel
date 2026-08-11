/**
 * R8 — Binary evidence types mirroring backPanel offlineEvidence.services.js.
 */
export const BINARY_SCHEMA_VERSION = 1
export const BINARY_MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'video/mp4', 'audio/mpeg',
]

export interface BinaryReceipt {
  evidenceId: string; commandId: string; orderId: string; packageId: string
  tenantId: string; actorId: string; deviceId: string
  contentHash: string; contentSize: number; contentType: string
  fileName: string | null; schemaVersion: number; status: string
  createdAt: string; updatedAt: string; idempotentReplay?: boolean
}

export interface StagedBinaryMeta {
  evidenceId: string; commandId: string; orderId: string; packageId: string
  contentHash: string; contentSize: number; contentType: string; fileName: string | null
  scopeKey: string; stagedAt: number
}

export const BINARY_ERROR_CODES = {
  DUPLICATE_EVIDENCE_ID: 'DUPLICATE_EVIDENCE_ID',
  HASH_MISMATCH: 'HASH_MISMATCH',
  SIZE_MISMATCH: 'SIZE_MISMATCH',
  INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE',
  SIZE_EXCEEDED: 'SIZE_EXCEEDED',
  BINARY_NOT_FOUND: 'BINARY_NOT_FOUND',
  BINARY_NOT_ACCEPTED: 'BINARY_NOT_ACCEPTED',
  CROSS_COMMAND_BINDING: 'CROSS_COMMAND_BINDING',
  DEVICE_NOT_REGISTERED: 'DEVICE_NOT_REGISTERED',
  DEVICE_REVOKED: 'DEVICE_REVOKED',
  OWNERSHIP_MISMATCH: 'OWNERSHIP_MISMATCH',
  LEASE_EXPIRED: 'LEASE_EXPIRED',
  LEASE_INVALID: 'LEASE_INVALID',
} as const
