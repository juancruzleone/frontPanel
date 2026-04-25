import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SupplierForm } from '../../../../src/features/suppliers/components/SupplierForm'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../src/i18n'

describe('SupplierForm', () => {
  it('debe validar campos obligatorios', async () => {
    const onSubmit = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <SupplierForm onSubmit={onSubmit} onCancel={vi.fn()} />
      </I18nextProvider>
    )

    fireEvent.click(screen.getByText(/common.save|Guardar/i))

    await waitFor(() => {
      expect(screen.getByText(/common.required|obligatorio/i)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('debe llamar a onSubmit con los datos correctos', async () => {
    const onSubmit = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <SupplierForm onSubmit={onSubmit} onCancel={vi.fn()} />
      </I18nextProvider>
    )

    fireEvent.change(screen.getByLabelText(/suppliers.name|Nombre/i), { target: { value: 'Proveedor Test' } })
    fireEvent.change(screen.getByLabelText(/suppliers.email|Email/i), { target: { value: 'test@example.com' } })
    
    fireEvent.click(screen.getByText(/common.save|Guardar/i))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Proveedor Test',
        email: 'test@example.com'
      }))
    })
  })
})
