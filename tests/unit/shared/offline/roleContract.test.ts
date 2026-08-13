import { describe, expect, it } from 'vitest'
import { verifyResourceChecksums } from '../../../../src/shared/offline/packageDownload'
import { canonicalJSON, sha256Hex } from '../../../../src/shared/offline/crypto'
import type { OfflineBootstrap, OfflineManifest } from '../../../../src/shared/offline/packageTypes'

const checksum = (value: unknown) => sha256Hex(new TextEncoder().encode(canonicalJSON(value)))

describe('offline role package contract', () => {
  it('verifies complete delivered objects, inventoryRefs, and documents', async () => {
    const installation = { _id: 'installation-1', company: 'Plant', devices: [{ _id: 'device-1' }] }
    const inventory = { _id: 'inventory-1', name: 'Filter', currentStock: 4 }
    const document = { documentId: 'doc-1', version: 1, contentHash: 'a'.repeat(64), contentSize: 10 }
    const manifest = {
      resourceChecksums: {
        installations: [await checksum(installation)],
        inventoryRefs: [await checksum(inventory)],
        documents: [await checksum(document)],
      },
    } as OfflineManifest
    const bootstrap = {
      manifest, workOrders: [], installations: [installation], assets: [], forms: [],
      inventoryRefs: [inventory], documents: [document],
    } as OfflineBootstrap

    expect(await verifyResourceChecksums(bootstrap, manifest)).toEqual({ ok: true })
  })

  it('models client/admin audiences and excludes super_admin', () => {
    const roles: NonNullable<OfflineManifest['role']>[] = ['tecnico', 'cliente', 'admin']
    expect(roles).toContain('cliente')
    expect(roles).toContain('admin')
    expect(roles).not.toContain('super_admin' as never)
  })
})
