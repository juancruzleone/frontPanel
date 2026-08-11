/**
 * R5 — AES-GCM envelope: seal/open round-trip, identity binding, tamper detection.
 */
import { describe, it, expect } from 'vitest'

const { generateStorageKey, encryptRecord, decryptRecord, buildRecordAad, base64UrlEncode, b64ToBytes } =
  await import('../../../../src/shared/offline/crypto')
const { seal, open, sealJson, openJson } = await import('../../../../src/shared/offline/envelope')
const { isEncryptedEnvelope } = await import('../../../../src/shared/offline/types')

describe('R5 AES-GCM primitives', () => {
  it('encrypt/decrypt round-trip', async () => {
    const key = await generateStorageKey()
    const pt = new TextEncoder().encode('secret data')
    const aad = buildRecordAad('t1:u1:dev1', 'testStore', 'kid1')
    const { iv, ciphertext } = await encryptRecord(key, pt, aad)
    expect(ciphertext).not.toEqual(pt)
    const dec = await decryptRecord(key, ciphertext, aad, iv)
    expect(new TextDecoder().decode(dec)).toBe('secret data')
  })

  it('rejects tampered ciphertext', async () => {
    const key = await generateStorageKey()
    const aad = buildRecordAad('t1:u1:dev1', 'store', 'k1')
    const { iv, ciphertext } = await encryptRecord(key, new TextEncoder().encode('data'), aad)
    const tampered = new Uint8Array(ciphertext)
    tampered[0] ^= 0xff
    await expect(decryptRecord(key, tampered, aad, iv)).rejects.toThrow()
  })

  it('rejects wrong AAD (store mismatch)', async () => {
    const key = await generateStorageKey()
    const aad = buildRecordAad('t1:u1:dev1', 'store', 'k1')
    const { iv, ciphertext } = await encryptRecord(key, new TextEncoder().encode('data'), aad)
    await expect(decryptRecord(key, ciphertext, buildRecordAad('t1:u1:dev1', 'other', 'k1'), iv)).rejects.toThrow()
  })

  it('rejects wrong key', async () => {
    const k1 = await generateStorageKey()
    const k2 = await generateStorageKey()
    const aad = buildRecordAad('s', 's', 'k')
    const { iv, ciphertext } = await encryptRecord(k1, new TextEncoder().encode('data'), aad)
    await expect(decryptRecord(k2, ciphertext, aad, iv)).rejects.toThrow()
  })

  it('AAD differs for different scopeKey', () => {
    const a1 = buildRecordAad('t1:u1:dev1', 'store', 'k1')
    const a2 = buildRecordAad('t1:u1:dev2', 'store', 'k1')
    expect(base64UrlEncode(a1)).not.toBe(base64UrlEncode(a2))
  })

  it('base64Url round-trip', () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0xfd, 0xfb, 0xf7])
    const encoded = base64UrlEncode(bytes)
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
    expect(b64ToBytes(encoded)).toEqual(bytes)
  })

  it('generateStorageKey is non-extractable', async () => {
    const key = await generateStorageKey()
    expect(key.extractable).toBe(false)
    expect(key.algorithm).toEqual({ name: 'AES-GCM', length: 256 })
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow()
  })
})

describe('R5 envelope seal/open', () => {
  it('seal-then-open round-trip', async () => {
    const key = await generateStorageKey()
    const pt = new TextEncoder().encode('hello world')
    const envelope = await seal({ key, kid: 'k1', scopeKey: 't1:u1:dev1', store: 'myStore', plaintext: pt })
    expect(isEncryptedEnvelope(envelope)).toBe(true)
    expect(envelope.v).toBe(4)
    expect(envelope.scopeKey).toBe('t1:u1:dev1')
    expect(envelope.store).toBe('myStore')
    const dec = await open({ key, envelope, expectedScopeKey: 't1:u1:dev1', expectedStore: 'myStore' })
    expect(new TextDecoder().decode(dec)).toBe('hello world')
  })

  it('sealJson/openJson round-trip', async () => {
    const key = await generateStorageKey()
    const value = { name: 'test', count: 42, nested: { a: true } }
    const envelope = await sealJson({ key, kid: 'k1', scopeKey: 's', store: 'st', value })
    const result = await openJson<typeof value>({ key, envelope, expectedScopeKey: 's', expectedStore: 'st' })
    expect(result).toEqual(value)
  })

  it('fails on scopeKey mismatch', async () => {
    const key = await generateStorageKey()
    const env = await seal({ key, kid: 'k1', scopeKey: 'owner-A', store: 'st', plaintext: new TextEncoder().encode('x') })
    await expect(open({ key, envelope: env, expectedScopeKey: 'owner-B', expectedStore: 'st' })).rejects.toThrow('scope-mismatch')
  })

  it('fails on store mismatch', async () => {
    const key = await generateStorageKey()
    const env = await seal({ key, kid: 'k1', scopeKey: 's', store: 'store-A', plaintext: new TextEncoder().encode('x') })
    await expect(open({ key, envelope: env, expectedScopeKey: 's', expectedStore: 'store-B' })).rejects.toThrow('store-mismatch')
  })

  it('fails on tampered ciphertext', async () => {
    const key = await generateStorageKey()
    const env = await seal({ key, kid: 'k1', scopeKey: 's', store: 'st', plaintext: new TextEncoder().encode('x') })
    const tampered = { ...env, ct: env.ct.split('').reverse().join('') }
    await expect(open({ key, envelope: tampered, expectedScopeKey: 's', expectedStore: 'st' })).rejects.toThrow()
  })

  it('fails on invalid envelope shape', async () => {
    const key = await generateStorageKey()
    await expect(open({ key, envelope: { v: 99 } as never, expectedScopeKey: 's', expectedStore: 'st' })).rejects.toThrow('invalid-envelope')
  })

  it('different plaintext produces different ciphertext', async () => {
    const key = await generateStorageKey()
    const e1 = await seal({ key, kid: 'k1', scopeKey: 's', store: 'st', plaintext: new TextEncoder().encode('aaa') })
    const e2 = await seal({ key, kid: 'k1', scopeKey: 's', store: 'st', plaintext: new TextEncoder().encode('bbb') })
    expect(e1.ct).not.toBe(e2.ct)
    expect(e1.iv).not.toBe(e2.iv)
  })
})
