/**
 * R2 — Offline trust: non-extractable ECDSA P-256 device keys, signed lease
 * verification (ECDSA P-256/SHA-256, IEEE-P1363), IndexedDB persistence, and
 * the offline gate. RED-first. Node crypto signs canonical claims and the
 * WebCrypto path must verify them, proving browser/backend interop.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPrivateKey, generateKeyPairSync, sign as nodeSign } from 'node:crypto'
import {
  canonicalJSON, generateDeviceKeyPair, verifyCanonicalSignature, verifyLeaseClaim,
  LEASE_MAX_MS, LEASE_SCHEMA_VERSION, type OfflineLeaseClaim, type VerificationKey,
} from '../../../src/shared/offline/crypto'
import {
  getOrCreateDeviceKey, saveDeviceRegistration, getStoredDevice, saveLease, getStoredLease,
  clearTrustForScope, evaluateOfflineGate, type StoredLease,
} from '../../../src/shared/offline/deviceTrust'

const SCOPE = 'tenant-A:user-1'
const TENANT = 'tenant-A', USER = 'user-1', DEVICE = 'device-1', KID = 'kid-2026-08'

async function serverKey(kid = KID) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  return { privateKey: pair.privateKey, key: { kid, kty: 'EC', crv: 'P-256', use: 'sig', key_ops: ['verify'], x: jwk.x!, y: jwk.y! } }
}
function claim(nowMs: number, overrides: Partial<OfflineLeaseClaim> = {}): OfflineLeaseClaim {
  const lastVerifiedAt = new Date(nowMs - 60_000).toISOString()
  return {
    schemaVersion: LEASE_SCHEMA_VERSION, tenantId: TENANT, userId: USER, deviceId: DEVICE, role: 'tecnico',
    permissions: ['offline:read', 'offline:write'], issuedAt: lastVerifiedAt, lastVerifiedAt,
    expiresAt: new Date(new Date(lastVerifiedAt).getTime() + LEASE_MAX_MS).toISOString(), ...overrides,
  }
}
function b64u(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const signClaim = async (value: unknown, privateKey: CryptoKey) => b64u(new Uint8Array(
  await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(canonicalJSON(value)))))
const storedLease = (nowMs: number, overrides: Partial<OfflineLeaseClaim> = {}, signature = 'dummy', kid = KID): StoredLease =>
  ({ id: SCOPE, claim: claim(nowMs, overrides), kid, signature, storedAt: nowMs })
// Compact in-memory IndexedDB mock (fresh per test)
function idbMock() {
  const dbs = new Map<string, Map<string, Map<string, unknown>>>()
  const storesFor = (db: string) => { if (!dbs.has(db)) dbs.set(db, new Map()); return dbs.get(db)! }
  const mkReq = (result?: unknown): any => { const req: any = { onsuccess: null, onerror: null, result }; queueMicrotask(() => req.onsuccess?.({ target: req })); return req }
  return {
    open(name: string) {
      const req: any = { onsuccess: null, onerror: null, onupgradeneeded: null, result: null }
      queueMicrotask(() => {
        const db: any = {
          objectStoreNames: { contains: (s: string) => storesFor(name).has(s) },
          close() {},
          createObjectStore(storeName: string) { if (!storesFor(name).has(storeName)) storesFor(name).set(storeName, new Map()); return { put: (v: any) => mkReq(v.id), get: (k: string) => mkReq(storesFor(name).get(storeName)?.get(k)), delete: (k: string) => { storesFor(name).get(storeName)?.delete(k); return mkReq(undefined) } } },
          transaction(storeNames: string | string[]) {
            const names = Array.isArray(storeNames) ? storeNames : [storeNames]
            const tx: any = { objectStore(storeName: string) {
              if (!storesFor(name).has(storeName)) storesFor(name).set(storeName, new Map())
              const m = storesFor(name).get(storeName)!
              return { put: (v: any) => { m.set(v.id ?? v.key ?? String(Date.now()), v); return mkReq(v.id) }, get: (k: string) => mkReq(m.get(k) ?? undefined), delete: (k: string) => { m.delete(k); return mkReq(undefined) }, getAll: () => mkReq(Array.from(m.values())) }
            }, oncomplete: null, onerror: null }
            queueMicrotask(() => tx.oncomplete?.({ target: tx }))
            return tx
          },
        }
        req.result = db
        req.onupgradeneeded?.({ target: req })
        req.onsuccess?.({ target: req })
      })
      return req
    },
  }
}

describe('canonicalJSON', () => {
  it('sorts keys recursively and strips whitespace (backend-compatible)', () => {
    expect(canonicalJSON({ b: 2, a: { d: 4, c: 3 }, z: [1, { y: 0, x: 1 }] })).toBe('{"a":{"c":3,"d":4},"b":2,"z":[1,{"x":1,"y":0}]}')
  })
})
describe('generateDeviceKeyPair', () => {
  it('produces a non-extractable private key; public JWK exports, private export is rejected', async () => {
    const { privateKey, publicKeyJwk } = await generateDeviceKeyPair()
    expect(privateKey.extractable).toBe(false)
    expect(publicKeyJwk.kty).toBe('EC')
    expect(publicKeyJwk.crv).toBe('P-256')
    expect(publicKeyJwk.d).toBeUndefined()
    await expect(crypto.subtle.exportKey('jwk', privateKey)).rejects.toThrow()
  })
})
describe('verifyCanonicalSignature', () => {
  const importPub = (key: VerificationKey) => crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: key.x, y: key.y }, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify'])
  it('accepts a genuine signature and rejects a tampered payload', async () => {
    const server = await serverKey()
    const value = claim(Date.now())
    const signature = await signClaim(value, server.privateKey)
    await expect(verifyCanonicalSignature(value, signature, await importPub(server.key))).resolves.toBe(true)
    await expect(verifyCanonicalSignature({ ...value, role: 'admin' }, signature, await importPub(server.key))).resolves.toBe(false)
  })
})
describe('verifyLeaseClaim', () => {
  const NOW = Date.now()
  const binding = { tenantId: TENANT, userId: USER, deviceId: DEVICE }
  it('accepts a valid lease signed by the current public verification key', async () => {
    const server = await serverKey()
    const value = claim(NOW)
    expect((await verifyLeaseClaim(value, await signClaim(value, server.privateKey), KID, [server.key], binding, NOW)).status).toBe('valid')
  })
  it('rejects a tampered lease (role changed after signing)', async () => {
    const server = await serverKey()
    const value = claim(NOW)
    const signature = await signClaim(value, server.privateKey)
    expect((await verifyLeaseClaim({ ...value, role: 'super_admin' }, signature, KID, [server.key], binding, NOW)).status).toBe('invalid_signature')
  })
  it('rejects expired / not-yet-valid / unknown-kid / malformed / no-keys leases', async () => {
    const server = await serverKey()
    const expired = claim(NOW, { expiresAt: new Date(NOW - 1).toISOString() })
    expect((await verifyLeaseClaim(expired, await signClaim(expired, server.privateKey), KID, [server.key], binding, NOW)).status).toBe('expired')
    const future = claim(NOW, { issuedAt: new Date(NOW + 60_000).toISOString(), lastVerifiedAt: new Date(NOW + 60_000).toISOString() })
    expect((await verifyLeaseClaim(future, await signClaim(future, server.privateKey), KID, [server.key], binding, NOW)).status).toBe('not_yet_valid')
    const value = claim(NOW)
    expect((await verifyLeaseClaim(value, await signClaim(value, server.privateKey), 'kid-x', [server.key], binding, NOW)).status).toBe('unknown_kid')
    expect((await verifyLeaseClaim(value, 'sig', KID, [], binding, NOW)).status).toBe('no_verification_keys')
    expect((await verifyLeaseClaim({ schemaVersion: 99 }, 'sig', KID, [server.key], binding, NOW)).status).toBe('malformed')
  })
  it('rejects a lease bound to a different tenant/user/device (forged binding)', async () => {
    const server = await serverKey()
    const value = claim(NOW)
    const signature = await signClaim(value, server.privateKey)
    expect((await verifyLeaseClaim(value, signature, KID, [server.key], { tenantId: 'other', userId: USER, deviceId: DEVICE }, NOW)).status).toBe('binding_mismatch')
  })
  it('enforces the seven-day window from signed claim data, never local timestamps', async () => {
    const server = await serverKey()
    const value = claim(NOW)
    expect(new Date(value.expiresAt).getTime() - new Date(value.lastVerifiedAt).getTime()).toBe(7 * 24 * 60 * 60 * 1000)
    const signature = await signClaim(value, server.privateKey)
    expect((await verifyLeaseClaim(value, signature, KID, [server.key], binding, new Date(value.expiresAt).getTime() - 1)).status).toBe('valid')
    expect((await verifyLeaseClaim(value, signature, KID, [server.key], binding, new Date(value.expiresAt).getTime() + 1)).status).toBe('expired')
  })
})
describe('node interop', () => {
  it('verifies a lease signed by Node crypto (IEEE-P1363, base64url) through the WebCrypto path', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    const jwk = publicKey.export({ format: 'jwk' })
    const key: VerificationKey = { kid: KID, kty: 'EC', crv: 'P-256', use: 'sig', key_ops: ['verify'], x: jwk.x!, y: jwk.y! }
    const value = claim(Date.now())
    const signature = nodeSign('sha256', Buffer.from(canonicalJSON(value)), { key: createPrivateKey({ key: privateKey.export({ format: 'jwk' }), format: 'jwk' }), dsaEncoding: 'ieee-p1363' }).toString('base64url')
    expect((await verifyLeaseClaim(value, signature, KID, [key], { tenantId: TENANT, userId: USER, deviceId: DEVICE }, Date.now())).status).toBe('valid')
  })
})
describe('deviceTrust persistence', () => {
  beforeEach(() => { (globalThis as any).indexedDB = idbMock() })
  it('generates once and persists only the public JWK (private stays a non-extractable handle)', async () => {
    const first = await getOrCreateDeviceKey(SCOPE)
    const second = await getOrCreateDeviceKey(SCOPE)
    expect(first.privateKey.extractable).toBe(false)
    expect(second.stored.publicKeyJwk.x).toBe(first.stored.publicKeyJwk.x)
    expect(JSON.stringify(second.stored.publicKeyJwk)).not.toContain('"d"')
  })
  it('stores the server-issued deviceId and public key after registration', async () => {
    const { stored } = await getOrCreateDeviceKey(SCOPE)
    await saveDeviceRegistration(SCOPE, DEVICE, stored.publicKeyJwk)
    const device = await getStoredDevice(SCOPE)
    expect(device?.deviceId).toBe(DEVICE)
    expect(JSON.stringify(device)).not.toContain('"d"')
  })
  it('persists and reloads a signed lease; clearTrustForScope removes both records', async () => {
    const lease = storedLease(Date.now())
    await saveLease(lease)
    expect((await getStoredLease(SCOPE))?.claim.deviceId).toBe(DEVICE)
    await getOrCreateDeviceKey(SCOPE)
    await saveDeviceRegistration(SCOPE, DEVICE, { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' })
    await clearTrustForScope(SCOPE)
    expect(await getStoredDevice(SCOPE)).toBeNull()
    expect(await getStoredLease(SCOPE)).toBeNull()
  })
})
describe('evaluateOfflineGate', () => {
  beforeEach(() => { (globalThis as any).indexedDB = idbMock() })
  const NOW = Date.now()
  it('fails closed with no device, no lease, or no verification keys', async () => {
    const key = await (await serverKey()).key
    expect(await evaluateOfflineGate({ tenantId: TENANT, userId: USER, deviceId: null, lease: null, keySet: [key], nowMs: NOW })).toBe('no-device')
    expect(await evaluateOfflineGate({ tenantId: TENANT, userId: USER, deviceId: DEVICE, lease: null, keySet: [key], nowMs: NOW })).toBe('no-lease')
    expect(await evaluateOfflineGate({ tenantId: TENANT, userId: USER, deviceId: DEVICE, lease: storedLease(NOW), keySet: [], nowMs: NOW })).toBe('no-verification-keys')
  })
  it('unlocks only for a valid, unexpired, correctly-bound signed lease', async () => {
    const server = await serverKey()
    const lease = storedLease(NOW)
    const signature = await signClaim(lease.claim, server.privateKey)
    const input = { tenantId: TENANT, userId: USER, deviceId: DEVICE, keySet: [server.key], nowMs: NOW }
    expect(await evaluateOfflineGate({ ...input, lease: { ...lease, signature } })).toBe('valid')
    expect(await evaluateOfflineGate({ ...input, tenantId: 'forged', lease: { ...lease, signature } })).toBe('binding-mismatch')
    expect(await evaluateOfflineGate({ ...input, nowMs: new Date(lease.claim.expiresAt).getTime() + 1, lease: { ...lease, signature } })).toBe('lease-expired')
    expect(await evaluateOfflineGate({ ...input, lease: { ...lease, claim: { ...lease.claim, role: 'admin' }, signature } })).toBe('lease-invalid')
  })
})