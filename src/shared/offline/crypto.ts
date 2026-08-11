/**
 * R2 — WebCrypto trust primitives: non-extractable ECDSA P-256 device keys,
 * canonical JSON (backend-compatible), signature verification.
 */
export interface VerificationKey { kid: string; kty: string; crv: string; x: string; y: string }

export function canonicalJSON(value: unknown): string { return JSON.stringify(sortKeys(value)) }

function sortKeys(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(sortKeys)
  return Object.keys(v as Record<string, unknown>).sort().reduce((acc, k) => {
    acc[k] = sortKeys((v as Record<string, unknown>)[k]); return acc
  }, {} as Record<string, unknown>)
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Generate ECDSA P-256 key pair. Private key re-imported as non-extractable. */
export async function generateDeviceKeyPair(): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey; publicKeyJwk: JsonWebKey }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const pubJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  const privJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  const nonExtractable = await crypto.subtle.importKey('jwk', privJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  return { privateKey: nonExtractable, publicKey: pair.publicKey, publicKeyJwk: pubJwk }
}

export async function importVerificationKey(jwk: VerificationKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk as JsonWebKey, { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' }, false, ['verify'])
}

export async function verifyCanonicalSignature(value: unknown, sigB64: string, pubKey: CryptoKey): Promise<boolean> {
  const canonical = new TextEncoder().encode(canonicalJSON(value))
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pubKey, b64ToBytes(sigB64), canonical)
}

export function b64ToBytes(b: string): Uint8Array {
  const p = b.replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(p)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

// ── R5: AES-GCM-256 per-record encryption ───────────────────────────────

export const AES_GCM_KEY_LENGTH = 256
export const GCM_IV_LENGTH = 12

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function canonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalJSON(value))
}

/** Generate a non-extractable AES-GCM-256 key. Handle persists in IndexedDB. */
export async function generateStorageKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: AES_GCM_KEY_LENGTH }, false, ['encrypt', 'decrypt'])
}

/** Encrypt with fresh random 12-byte IV and record-bound AAD. */
export async function encryptRecord(key: CryptoKey, plaintext: Uint8Array, aad: Uint8Array): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH))
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, plaintext))
  return { iv, ciphertext }
}

/** Decrypt; AES-GCM authentication rejects any tamper. */
export async function decryptRecord(key: CryptoKey, ciphertext: Uint8Array, aad: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, ciphertext))
}

/** Build AAD: canonical bytes of {scope, store, key}. Forged binding → GCM auth fail. */
export function buildRecordAad(scopeKey: string, store: string, kid: string): Uint8Array {
  return canonicalBytes({ scope: scopeKey, store, key: kid })
}
