import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type React from 'react'
import { InventoryTable } from '../../../../src/features/inventory/components/InventoryTable'
import { InventoryItem } from '../../../../src/features/inventory/types/inventory.types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../../../src/shared/components/Tooltip/Tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))

describe('InventoryTable', () => {
  const handlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAdjust: vi.fn(),
    onViewHistory: vi.fn(),
  }

  it('muestra gestión de stock y oculta acciones que requieren item de inventario en filas derivadas de activos', () => {
    const items: InventoryItem[] = [
      {
        _id: 'asset-asset-1',
        assetId: 'asset-1',
        tenantId: '',
        name: 'Activo real',
        unit: 'unidades',
        currentStock: 1,
        minimumStock: 0,
        active: true,
        inventorySource: 'asset',
      },
    ]

    render(<InventoryTable items={items} isAdmin {...handlers} />)

    expect(screen.getByText('Activo real')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'inventory.history' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'inventory.adjustStock' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'common.edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'common.delete' })).not.toBeInTheDocument()
  })

  it('muestra acciones administrativas para items reales de inventario', () => {
    const items: InventoryItem[] = [
      {
        _id: 'inventory-1',
        tenantId: 'tenant',
        name: 'Repuesto real',
        unit: 'unidades',
        currentStock: 5,
        minimumStock: 2,
        active: true,
      },
    ]

    render(<InventoryTable items={items} isAdmin {...handlers} />)

    expect(screen.getByRole('button', { name: 'inventory.history' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'inventory.adjustStock' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.delete' })).toBeInTheDocument()
  })
})
