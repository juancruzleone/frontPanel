/**
 * R10 — Offline document types and constants.
 * Mirrors backPanel offlineDocument.services.js + offline.schema.js.
 */
export const DOCUMENT_MAX_SIZE_BYTES = 100 * 1024 * 1024
export const DOCUMENT_MAX_QUOTA_BYTES = 500 * 1024 * 1024
export const DOCUMENT_MAX_COUNT = 200
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv',
]
export const DOCUMENT_STATUS = { AVAILABLE: 'available', PENDING: 'pending', STALE: 'stale', REVOKED: 'revoked' } as const
export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS]
export const DOCUMENT_ERROR_CODES = {
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND', DOCUMENT_STALE: 'DOCUMENT_STALE',
  DOCUMENT_TAMPERED: 'DOCUMENT_TAMPERED', DOCUMENT_UNAVAILABLE: 'DOCUMENT_UNAVAILABLE',
  INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE', SIZE_EXCEEDED: 'SIZE_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED', COUNT_EXCEEDED: 'COUNT_EXCEEDED',
  HASH_MISMATCH: 'HASH_MISMATCH', DEVICE_NOT_REGISTERED: 'DEVICE_NOT_REGISTERED',
  DEVICE_REVOKED: 'DEVICE_REVOKED', OWNERSHIP_MISMATCH: 'OWNERSHIP_MISMATCH',
  LEASE_EXPIRED: 'LEASE_EXPIRED', LEASE_INVALID: 'LEASE_INVALID',
} as const
export type DocumentErrorCode = (typeof DOCUMENT_ERROR_CODES)[keyof typeof DOCUMENT_ERROR_CODES]
export interface DocumentScope { orderId?: string; instalacionId?: string; activoId?: string; packageId?: string }
export interface DocumentManifestEntry {
  documentId: string; version: number; title: string; contentType: string
  contentSize: number; contentHash: string; scope: DocumentScope; status: DocumentStatus; checksum: string
}
export interface DocumentReceipt {
  documentId: string; version: number; contentHash: string; contentSize: number
  contentType: string; status: DocumentStatus; idempotentReplay?: boolean; updated?: boolean
}
export interface DocumentContentMeta {
  documentId: string; version: number; title: string; contentType: string
  contentSize: number; contentHash: string; scope: DocumentScope; status: string
}
export interface DocumentServiceError { message: string; code: string }

// ── R2: Lease types (mirrors backPanel offlineDeviceLease.services.js) ───
export const LEASE_MAX_MS = 7 * 24 * 60 * 60 * 1000
export type LeaseStatus = 'valid' | 'expired' | 'revoked' | 'unknown'
export interface OfflineLeaseClaim {
  schemaVersion: number; tenantId: string; userId: string; deviceId: string
  role: string; permissions: string[]; issuedAt: string; lastVerifiedAt: string; expiresAt: string
}
export interface OfflineLeaseHeader { alg: string; kid: string }
export interface StoredLease {
  lease: OfflineLeaseClaim; header: OfflineLeaseHeader; signature: string; storedAt: number
}
export interface StoredDocumentRecord {
  documentId: string; version: number; title: string; contentType: string
  contentSize: number; contentHash: string; scope: DocumentScope
  status: DocumentStatus; blob: Blob; storedAt: number; scopeKey: string
}

// ── R5: Encrypted-at-rest envelope (schema v4) ──────────────────────────
export const OFFLINE_STORAGE_SCHEMA_VERSION = 4
export interface EncryptedRecordEnvelope {
  v: 4; scopeKey: string; store: string; kid: string
  iv: string; aad: string; ct: string; at: number
}
export function isEncryptedEnvelope(value: unknown): value is EncryptedRecordEnvelope {
  if (value === null || typeof value !== 'object') return false
  const e = value as Partial<EncryptedRecordEnvelope>
  return e.v === 4 && typeof e.scopeKey === 'string' && typeof e.store === 'string'
    && typeof e.kid === 'string' && typeof e.iv === 'string'
    && typeof e.aad === 'string' && typeof e.ct === 'string' && typeof e.at === 'number'
}
export class OfflineEncryptionError extends Error {
  readonly code: string
  constructor(code: string, message?: string) { super(message ?? code); this.name = 'OfflineEncryptionError'; this.code = code }
}
export class OfflineRecordTamperError extends OfflineEncryptionError {
  constructor(detail = 'ciphertext-tamper') { super('OFFLINE_RECORD_TAMPER', detail) }
}
