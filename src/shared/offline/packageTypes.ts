/**
 * R3 — Package types mirroring backPanel offlinePackage.services.js.
 * Exact shapes from buildBootstrap + fetchDeltas + error codes.
 */
export const PACKAGE_SCHEMA_VERSION = 1
export const PACKAGE_LEASE_MAX_MS = 7 * 24 * 60 * 60 * 1000

export interface OfflineFormCompleteness { available: boolean; version?: number; checksum?: string; reason?: string }
export interface OfflineManifestSignature { alg: string; kid: string; value: string }
export interface OfflineManifestClaim {
  schemaVersion: number; serverTime: string; packageId: string; packageVersion: number
  deviceId: string; userId: string; tenantId: string
  binding: { tenantId: string; userId: string; deviceId: string }
  cursor: number; expiresAt: string; revocationEpoch: number
  limits: { maxDeltaSize: number; maxPackageSizeMB: number }
  completeness: Record<string, OfflineFormCompleteness>
  resourceChecksums: Record<string, string[]>
  role?: 'tecnico' | 'cliente' | 'admin'
  permissions?: string[]
  audience?: {
    role: 'tecnico' | 'cliente' | 'admin'; workOrderIds: string[]; installationIds: string[]
    assetIds: string[]; formIds: string[]; inventoryIds: string[]; documentIds: string[]
  }
  documents: Array<{ documentId: string; version: number; contentHash: string; contentSize: number; checksum: string }>
}
export interface OfflineManifest extends OfflineManifestClaim { signature: OfflineManifestSignature }
export interface OfflineBootstrap {
  success?: boolean; manifest: OfflineManifest
  workOrders: Array<Record<string, unknown>>; installations: Array<Record<string, unknown>>
  assets: Array<Record<string, unknown>>; forms: Array<Record<string, unknown>>
  inventoryRefs: Array<Record<string, unknown>>
  documents?: Array<Record<string, unknown>>
}
export interface OfflineDeltaEntry {
  cursor: number; entityId: string; collection: string; operation: 'upsert' | 'delete'
  data?: unknown; reason?: string; timestamp: string
}
export interface OfflineDeltaResponse {
  success?: boolean; packageId: string; deviceId: string
  deltas: OfflineDeltaEntry[]; nextCursor: number; hasMore: boolean
}
export const PACKAGE_ERROR_CODES = {
  PACKAGE_NOT_FOUND: 'PACKAGE_NOT_FOUND', PACKAGE_EXPIRED: 'PACKAGE_EXPIRED',
  CURSOR_EXPIRED: 'CURSOR_EXPIRED', SIGNING_CONFIG_MISSING: 'SIGNING_CONFIG_MISSING',
} as const
