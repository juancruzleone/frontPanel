import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ModalCompleteWorkOrder from '../../../../src/features/workOrders/components/ModalCompleteWorkOrder'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../src/i18n'
import * as inventoryHooks from '../../../../src/features/inventory/hooks/useInventory'

vi.mock('../../../../src/features/inventory/hooks/useInventory')

describe('ModalCompleteWorkOrder with Inventory', () => {
  const mockWorkOrder = {
    _id: '123',
    titulo: 'OT Test',
    estado: 'asignada',
    dispositivo: { nombre: 'Disp 1', ubicacion: 'Ubic 1' }
  } as any

  const mockInventoryItems = [
    { _id: 'inv1', name: 'Tornillo', unit: 'u', currentStock: 100, minimumStock: 10 }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(inventoryHooks.default as any).mockReturnValue({
      items: mockInventoryItems,
      loadInventory: vi.fn(),
    })
    
    // Mock URL.createObjectURL for signature/photos if needed
    global.URL.createObjectURL = vi.fn(() => 'mock-url')
    
    // Mock canvas getContext and toDataURL
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        clearRect: vi.fn(),
    })
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mock')
  })

  it('debe mostrar la sección de materiales de inventario', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ModalCompleteWorkOrder 
          isOpen={true} 
          onRequestClose={vi.fn()} 
          onSubmitSuccess={vi.fn()} 
          onComplete={vi.fn()} 
          workOrder={mockWorkOrder} 
        />
      </I18nextProvider>
    )
    expect(screen.getByText(/Materiales del Inventario/i)).toBeInTheDocument()
  })

  it('debe poblar materialesUtilizados (legacy) cuando se agregan items de inventario', async () => {
    const onComplete = vi.fn().mockResolvedValue({ message: 'Success' })
    render(
      <I18nextProvider i18n={i18n}>
        <ModalCompleteWorkOrder 
          isOpen={true} 
          onRequestClose={vi.fn()} 
          onSubmitSuccess={vi.fn()} 
          onComplete={onComplete} 
          workOrder={mockWorkOrder} 
        />
      </I18nextProvider>
    )

    // Add inventory item
    const selects = screen.getAllByRole('combobox')
    const inventorySelect = selects.find(s => s.innerHTML.includes('-- Seleccionar Item --')) || selects[0]
    
    fireEvent.change(inventorySelect, { target: { value: 'inv1' } })
    const spinButtons = screen.getAllByRole('spinbutton')
    fireEvent.change(spinButtons[0], { target: { value: '5' } })
    fireEvent.click(screen.getByLabelText(/Add Part/i))

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText(/Describe detalladamente/i), { target: { value: 'Mantenimiento realizado' } })
    fireEvent.change(screen.getByPlaceholderText(/Agrega observaciones/i), { target: { value: 'Todo ok' } })
    
    // Mock signature (it's required)
    const canvas = document.querySelector('canvas')!
    fireEvent.mouseDown(canvas) // Set isDrawingRef.current = true
    fireEvent.mouseUp(canvas)   // Trigger updateSignatureValue

    const submitButton = screen.getByRole('button', { name: /Completar Orden/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith('123', expect.objectContaining({
        inventoryPartsUsed: expect.arrayContaining([
          expect.objectContaining({ inventoryItemId: 'inv1', quantity: 5 })
        ]),
        materialesUtilizados: expect.arrayContaining([
          expect.objectContaining({ nombre: 'Tornillo', cantidad: 5, unidad: 'u' })
        ])
      }))
    })
  })
})
