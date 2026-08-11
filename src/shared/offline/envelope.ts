/**
 * R5 — AES-GCM envelope: seal (encrypt→envelope) and open (envelope→decrypt).
 * Identity-bound AAD prevents cross-scope/key forgery. Fail closed on tamper.
 */
import {
  encryptRecord, decryptRecord, buildRecordAad, base64UrlEncode, b64ToBytes,
} from './crypto'
import {
  type EncryptedRecordEnvelope, isEncryptedEnvelope, OfflineRecordTamperError,
} from './types'

export type { EncryptedRecordEnvelope }

export interface SealParams {
  key: CryptoKey
  kid: string
  scopeKey: string
  store: string
  plaintext: Uint8Array
}

export interface OpenParams {
  key: CryptoKey
  envelope: EncryptedRecordEnvelope
  expectedScopeKey: string
  expectedStore: string
}

/**
 * Seal: encrypt plaintext and wrap in an identity-bound envelope.
 * AAD binds (scopeKey, store, kid) — forged identity → GCM auth failure on open.
 */
export async function seal(params: SealParams): Promise<EncryptedRecordEnvelope> {
  const aad = buildRecordAad(params.scopeKey, params.store, params.kid)
  const { iv, ciphertext } = await encryptRecord(params.key, params.plaintext, aad)
  return {
    v: 4,
    scopeKey: params.scopeKey,
    store: params.store,
    kid: params.kid,
    iv: base64UrlEncode(iv),
    aad: base64UrlEncode(aad),
    ct: base64UrlEncode(ciphertext),
    at: Date.now(),
  }
}

/**
 * Open: verify identity binding, then decrypt envelope.
 * Fails closed on: wrong scopeKey, wrong store, tampered ciphertext/IV/AAD,
 * or envelope that doesn't match expected identity.
 */
export async function open(params: OpenParams): Promise<Uint8Array> {
  const { key, envelope, expectedScopeKey, expectedStore } = params

  if (!isEncryptedEnvelope(envelope)) throw new OfflineRecordTamperError('invalid-envelope')

  // Identity binding check — fail closed on mismatch
  if (envelope.scopeKey !== expectedScopeKey) throw new OfflineRecordTamperError('scope-mismatch')
  if (envelope.store !== expectedStore) throw new OfflineRecordTamperError('store-mismatch')

  // Reconstruct AAD from expected identity (not from envelope — prevents forgery)
  const expectedAad = buildRecordAad(expectedScopeKey, expectedStore, envelope.kid)
  const iv = b64ToBytes(envelope.iv)
  const ciphertext = b64ToBytes(envelope.ct)

  try {
    return await decryptRecord(key, ciphertext, expectedAad, iv)
  } catch {
    throw new OfflineRecordTamperError('gcm-auth-failed')
  }
}

/**
 * Wrap a JSON-serializable value in an encrypted envelope.
 * Convenience for records that serialize as JSON.
 */
export async function sealJson(params: Omit<SealParams, 'plaintext'> & { value: unknown }): Promise<EncryptedRecordEnvelope> {
  const plaintext = new TextEncoder().encode(JSON.stringify(params.value))
  return seal({ ...params, plaintext })
}

/**
 * Open an encrypted envelope and parse as JSON.
 * Convenience for records that serialize as JSON.
 */
export async function openJson<T>(params: OpenParams): Promise<T> {
  const bytes = await open(params)
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}
