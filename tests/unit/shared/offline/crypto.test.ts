/**
 * R2 — WebCrypto: key generation, canonical JSON, signature verification.
 */
import { describe, it, expect } from 'vitest'

const { canonicalJSON, sha256Hex, generateDeviceKeyPair, importVerificationKey, verifyCanonicalSignature } =
  await import('../../../../src/shared/offline/crypto')

describe('R2 crypto', () => {
  describe('canonicalJSON', () => {
    it('sorts keys recursively', () => { expect(canonicalJSON({ b: 1, a: 2 })).toBe('{"a":2,"b":1}') })
    it('sorts nested', () => { expect(canonicalJSON({ z: { c: 1, a: 2 }, a: 1 })).toBe('{"a":1,"z":{"a":2,"c":1}}') })
    it('preserves array order', () => { expect(canonicalJSON({ b: [3, 1, 2], a: 1 })).toBe('{"a":1,"b":[3,1,2]}') })
    it('handles null/primitives', () => { expect(canonicalJSON({ a: null, b: 's', c: 42 })).toBe('{"a":null,"b":"s","c":42}') })
  })

  describe('sha256Hex', () => {
    it('returns 64-char lowercase hex', async () => { expect(await sha256Hex(new TextEncoder().encode('t'))).toMatch(/^[a-f0-9]{64}$/) })
    it('deterministic', async () => { expect(await sha256Hex(new TextEncoder().encode('x'))).toBe(await sha256Hex(new TextEncoder().encode('x'))) })
  })

  describe('generateDeviceKeyPair', () => {
    it('private key is non-extractable', async () => {
      const { privateKey, publicKeyJwk } = await generateDeviceKeyPair()
      expect(privateKey.extractable).toBe(false)
      expect(publicKeyJwk.kty).toBe('EC')
      expect(publicKeyJwk.crv).toBe('P-256')
      expect(publicKeyJwk.x).toBeDefined()
      expect(publicKeyJwk.y).toBeDefined()
    })
    it('private key cannot be exported', async () => {
      const { privateKey } = await generateDeviceKeyPair()
      await expect(crypto.subtle.exportKey('jwk', privateKey)).rejects.toThrow()
    })
  })

  describe('sign + verify', () => {
    it('verifies valid signature', async () => {
      const { privateKey, publicKeyJwk } = await generateDeviceKeyPair()
      const value = { tenantId: 't1', userId: 'u1' }
      const sig = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(canonicalJSON(value)),
      )
      const b64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const pub = await importVerificationKey(publicKeyJwk as unknown as import('./crypto').VerificationKey)
      expect(await verifyCanonicalSignature(value, b64, pub)).toBe(true)
    })
    it('rejects tampered value', async () => {
      const { privateKey, publicKeyJwk } = await generateDeviceKeyPair()
      const sig = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(canonicalJSON({ a: 1 })),
      )
      const b64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const pub = await importVerificationKey(publicKeyJwk as unknown as import('./crypto').VerificationKey)
      expect(await verifyCanonicalSignature({ a: 2 }, b64, pub)).toBe(false)
    })
    it('rejects forged signature', async () => {
      const { publicKeyJwk } = await generateDeviceKeyPair()
      const pub = await importVerificationKey(publicKeyJwk as unknown as import('./crypto').VerificationKey)
      expect(await verifyCanonicalSignature({ a: 1 }, 'AAAA', pub)).toBe(false)
    })
  })
})
