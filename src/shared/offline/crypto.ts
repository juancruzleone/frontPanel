/**
 * R2 — WebCrypto trust primitives: non-extractable ECDSA P-256 device keys,
 * canonical JSON (byte-compatible with the R1 backend), IEEE-P1363 signature
 * verification, and typed signed-lease verification against the trusted
 * server verification-key set.
 */
export const LEASE_SCHEMA_VERSION = 1
export const LEASE_MAX_MS = 7 * 24 * 60 * 60 * 1000 // seven-day lease

export interface VerificationKey { kid: string; kty: string; crv: string; use?: string; key_ops?: string[]; x: string; y: string }
export interface OfflineLeaseClaim {
  schemaVersion: number; tenantId: string; userId: string; deviceId: string
  role: string; permissions: string[]; issuedAt: string; lastVerifiedAt: string; expiresAt: string
}
export interface LeaseBinding { tenantId: string; userId: string; deviceId: string }
export type LeaseVerificationStatus =
  | 'valid' | 'no_verification_keys' | 'unknown_kid' | 'invalid_signature'
  | 'binding_mismatch' | 'expired' | 'not_yet_valid' | 'malformed'
export interface LeaseVerificationResult { status: LeaseVerificationStatus }
function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('WebCrypto unavailable')
  return subtle
}
/** Canonical JSON: recursively sorted keys, no whitespace (backend-compatible). */
export function canonicalJSON(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}
/** Canonical UTF-8 bytes of a value (byte-compatible with the backend checksums). */
export function canonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalJSON(value))
}
/** WebCrypto SHA-256 digest as lowercase hex. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await getSubtle().digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
/** SHA-256 hex of the canonical form of a value (checksum verification only). */
export async function sha256HexCanonical(value: unknown): Promise<string> {
  return sha256Hex(canonicalBytes(value))
}
function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(sortKeys)
  return Object.keys(value as Record<string, unknown>).sort().reduce((acc, key) => {
    acc[key] = sortKeys((value as Record<string, unknown>)[key])
    return acc
  }, {} as Record<string, unknown>)
}
/**
 * Generate a device key pair. WebCrypto applies `extractable` to the whole
 * pair, so generate extractable, export the public JWK for registration, then
 * re-import the private half as non-extractable: the persisted handle can
 * never be exported and no private JWK is ever stored or sent.
 */
export async function generateDeviceKeyPair(): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey; publicKeyJwk: JsonWebKey }> {
  const subtle = getSubtle()
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const privateJwk = await subtle.exportKey('jwk', pair.privateKey)
  const publicKeyJwk = await subtle.exportKey('jwk', pair.publicKey)
  const privateKey = await subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  return { privateKey, publicKey: pair.publicKey, publicKeyJwk }
}
/** Import a trusted server verification key (public JWK only). */
export async function importVerificationKey(key: VerificationKey): Promise<CryptoKey> {
  return getSubtle().importKey('jwk', { kty: key.kty, crv: key.crv, x: key.x, y: key.y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify'])
}
/** Verify a base64url IEEE-P1363 ECDSA P-256/SHA-256 signature over canonicalJSON(payload). */
export async function verifyCanonicalSignature(payload: unknown, signatureBase64url: string, publicKey: CryptoKey): Promise<boolean> {
  try {
    const signature = base64UrlToBytes(signatureBase64url)
    const data = new TextEncoder().encode(canonicalJSON(payload))
    return await getSubtle().verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, signature, data)
  } catch { return false }
}
/**
 * Verify a signed lease claim with a typed result. Fails closed on every
 * tamper vector: unknown kid, bad signature, expired/not-yet-valid window,
 * binding mismatch, or malformed claim. Time is injected so expiry is
 * deterministic and clock rollback fails closed.
 */
export async function verifyLeaseClaim(
  claim: unknown, signature: string, kid: string | undefined, keySet: VerificationKey[],
  binding: LeaseBinding, nowMs: number
): Promise<LeaseVerificationResult> {
  if (!keySet.length) return { status: 'no_verification_keys' }
  if (!isLeaseClaim(claim)) return { status: 'malformed' }
  if (!kid) return { status: 'unknown_kid' }
  const key = keySet.find((k) => k.kid === kid)
  if (!key) return { status: 'unknown_kid' }
  const publicKey = await importVerificationKey(key).catch(() => null)
  if (!publicKey) return { status: 'unknown_kid' }
  if (!(await verifyCanonicalSignature(claim, signature, publicKey))) return { status: 'invalid_signature' }
  if (claim.tenantId !== binding.tenantId || claim.userId !== binding.userId || claim.deviceId !== binding.deviceId) return { status: 'binding_mismatch' }
  const expiresMs = Date.parse(claim.expiresAt)
  if (Number.isNaN(expiresMs) || expiresMs <= nowMs) return { status: 'expired' }
  const issuedMs = Date.parse(claim.issuedAt)
  if (Number.isNaN(issuedMs) || issuedMs > nowMs) return { status: 'not_yet_valid' }
  return { status: 'valid' }
}
function isLeaseClaim(value: unknown): value is OfflineLeaseClaim {
  if (value === null || typeof value !== 'object') return false
  const c = value as Partial<OfflineLeaseClaim>
  return c.schemaVersion === LEASE_SCHEMA_VERSION && typeof c.tenantId === 'string' && typeof c.userId === 'string'
    && typeof c.deviceId === 'string' && typeof c.role === 'string' && Array.isArray(c.permissions)
    && typeof c.issuedAt === 'string' && typeof c.lastVerifiedAt === 'string' && typeof c.expiresAt === 'string'
}
function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}