import { describe, it, expect, vi } from 'vitest'
import { validateInventoryForm } from '../../../../src/features/inventory/validators/inventoryValidators'

describe('Inventory Validators', () => {
  const t = (key: string) => key

  it('debe validar un item de inventario válido', async () => {
    const validData = {
      name: 'Item Test',
      unit: 'unidades',
      currentStock: 10,
      minimumStock: 5
    }
    const result = await validateInventoryForm(validData, t)
    expect(result.isValid).toBe(true)
  })

  it('debe fallar si falta el nombre', async () => {
    const invalidData = {
      unit: 'unidades'
    }
    const result = await validateInventoryForm(invalidData, t)
    expect(result.isValid).toBe(false)
    expect(result.errors.name).toBeDefined()
  })
})
