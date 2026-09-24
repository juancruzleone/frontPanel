import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ModalMovementHistory from '../../../../src/features/inventory/components/ModalMovementHistory'
import { fetchInventoryMovements } from '../../../../src/features/inventory/services/inventoryServices'

vi.mock('../../../../src/features/inventory/services/inventoryServices', () => ({
  fetchInventoryMovements: vi.fn(),
  exportInventoryMovements: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('ModalMovementHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('muestra el error cuando no puede cargar el historial', async () => {
    vi.mocked(fetchInventoryMovements).mockRejectedValue(new Error('History unavailable'))

    render(
      <ModalMovementHistory
        isOpen
        item={{ _id: 'item-1', tenantId: 'tenant-1', name: 'Bearing', unit: 'u', currentStock: 2, minimumStock: 1, active: true }}
        onRequestClose={vi.fn()}
      />,
    )

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('History unavailable'))
  })
})
