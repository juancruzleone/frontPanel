/**
 * R6 — Command types mirroring backPanel offlineCommand.services.js.
 */
export const COMMAND_SCHEMA_VERSION = 1
export type CommandType = 'start' | 'maintenance' | 'completion' | 'evidence' | 'client_maintenance_request'
export type CommandStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'conflict' | 'dead-letter'
export type ErrorCategory = 'retryable' | 'permanent' | 'conflict' | 'validation' | 'rate_limit'
export interface CommandReceipt {
  commandId: string; commandType: CommandType; tenantId: string; actorId: string
  deviceId: string; packageId: string; schemaVersion: number; payloadHash: string
  entityId: string; entityType?: string | null; expectedEntityVersion?: number
  expectedFormVersion?: number | null; dependsOn: string[]; status: CommandStatus
  category?: ErrorCategory | null; result?: Record<string, unknown> | null
  failureCode?: string | null; failureReason?: string | null
  retryCount: number; executedAt?: string | null; createdAt: string; updatedAt: string
  idempotentReplay?: boolean
}
export interface OfflineCommand {
  commandId: string; commandType: CommandType; tenantId: string; actorId: string
  deviceId: string; packageId: string; payload: Record<string, unknown>
  payloadHash: string; schemaVersion: number; entityId: string
  entityType?: string | null; expectedEntityVersion?: number
  expectedFormVersion?: number | null; dependsOn: string[]
  status: CommandStatus; category?: ErrorCategory | null
  result?: Record<string, unknown> | null; failureCode?: string | null
  failureReason?: string | null; retryCount: number; createdAt: string; updatedAt: string
}
export const COMMAND_ERROR_CODES = {
  IDEMPOTENCY_KEY_REUSED: 'IDEMPOTENCY_KEY_REUSED', COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  PAYLOAD_INTEGRITY: 'PAYLOAD_INTEGRITY', DEPENDENCY_NOT_MET: 'DEPENDENCY_NOT_MET',
  DEPENDENCY_FAILED: 'DEPENDENCY_FAILED', DEVICE_NOT_REGISTERED: 'DEVICE_NOT_REGISTERED',
  DEVICE_REVOKED: 'DEVICE_REVOKED', OWNERSHIP_MISMATCH: 'OWNERSHIP_MISMATCH',
  LEASE_EXPIRED: 'LEASE_EXPIRED', LEASE_INVALID: 'LEASE_INVALID',
  DEVICE_SIGNATURE_MISSING: 'DEVICE_SIGNATURE_MISSING', DEVICE_SIGNATURE_INVALID: 'DEVICE_SIGNATURE_INVALID',
} as const
