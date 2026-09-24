import { describe, expect, it } from 'vitest'
import {
  computeInventoryRefChecksum,
  filterVerifiedPackageInventoryRefs,
  selectCompletionInventory,
} from '../../../../src/shared/offline/packageStorage'

describe('package-scoped completion inventory', () => {
  it('keeps only checksum-verified refs assigned to the work order', async () => {
    const assigned = { _id: 'inv-1', name: 'Filter', tenantId: 'tenant-1' }
    const foreign = { _id: 'inv-2', name: 'Foreign', tenantId: 'tenant-2' }
    const refs = await filterVerifiedPackageInventoryRefs({
      inventoryRefs: [assigned, foreign],
      checksums: [await computeInventoryRefChecksum(assigned), 'tampered'],
      allowedInventoryIds: ['inv-1'],
      assignedWorkOrderIds: ['wo-1'],
      workOrderId: 'wo-1',
    })

    expect(refs).toEqual([assigned])
  })

  it('fails closed for a foreign work order and does not expose general cache', async () => {
    const ref = { _id: 'inv-1', name: 'Filter' }
    const refs = await filterVerifiedPackageInventoryRefs({
      inventoryRefs: [ref],
      checksums: [await computeInventoryRefChecksum(ref)],
      allowedInventoryIds: ['inv-1'],
      assignedWorkOrderIds: ['wo-1'],
      workOrderId: 'wo-foreign',
    })

    expect(refs).toEqual([])
    expect(selectCompletionInventory({ online: false, liveItems: [ref], packageRefs: refs })).toEqual([])
  })
})
