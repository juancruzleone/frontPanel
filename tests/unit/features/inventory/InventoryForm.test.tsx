import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InventoryForm } from '../../../../src/features/inventory/components/InventoryForm'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../src/i18n'
import { ThemeProvider } from '../../../../src/shared/hooks/useTheme'

const supplierMocks = vi.hoisted(() => ({
  loadSuppliers: vi.fn(),
  supplier: {
    _id: 'supplier-1',
    name: 'Proveedor Uno',
    contactName: 'Contacto',
    email: 'proveedor@example.com',
    phone: '123456789',
  },
  suppliers: [
    {
      _id: 'supplier-1',
      name: 'Proveedor Uno',
      contactName: 'Contacto',
      email: 'proveedor@example.com',
      phone: '123456789',
    },
  ],
}))

vi.mock('../../../../src/features/suppliers/hooks/useSuppliers', () => ({
  useSuppliers: () => ({
    suppliers: supplierMocks.suppliers,
    loading: false,
    loadSuppliers: supplierMocks.loadSuppliers,
  }),
}))

describe('InventoryForm', () => {
  beforeEach(async () => {
    supplierMocks.loadSuppliers.mockClear()
    supplierMocks.suppliers.splice(0, supplierMocks.suppliers.length, supplierMocks.supplier)
    await i18n.changeLanguage('es')
  })

  it('debe renderizar el formulario correctamente', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <InventoryForm onSubmit={vi.fn()} onCancel={vi.fn()} />
        </ThemeProvider>
      </I18nextProvider>
    )
    expect(screen.getByText(/nombre/i)).toBeInTheDocument()
    expect(screen.getByText(/unidad/i)).toBeInTheDocument()
  })

  it('muestra las etiquetas traducidas y el placeholder natural del proveedor', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <InventoryForm onSubmit={vi.fn()} onCancel={vi.fn()} />
        </ThemeProvider>
      </I18nextProvider>
    )

    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.queryByText('common.active')).not.toBeInTheDocument()
    const supplierSelect = screen.getByRole('combobox', { name: 'Proveedores' })
    expect(supplierSelect).toHaveTextContent('Seleccionar proveedor')
    expect(screen.queryByText('-- Seleccionar proveedor --')).not.toBeInTheDocument()

    fireEvent.click(supplierSelect)
    fireEvent.click(screen.getByText('Proveedor Uno'))
    expect(supplierSelect).toHaveTextContent('Proveedor Uno')
  })

  it('conserva y envía el proveedor seleccionado al editar', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    supplierMocks.suppliers.splice(0)

    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <InventoryForm
            initialData={{
              name: 'Filtro',
              unit: 'unidades',
              currentStock: 4,
              minimumStock: 1,
              active: true,
              supplierSnapshot: {
                supplierId: 'supplier-1',
                name: 'Proveedor Uno',
              },
            }}
            onSubmit={onSubmit}
            onCancel={vi.fn()}
          />
        </ThemeProvider>
      </I18nextProvider>
    )

    expect(screen.getByRole('combobox', { name: 'Proveedores' })).toHaveTextContent('Proveedor Uno')
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar' }).closest('form')!)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        supplierSnapshot: expect.objectContaining({
          supplierId: 'supplier-1',
          name: 'Proveedor Uno',
        }),
      }))
    })
  })
})
