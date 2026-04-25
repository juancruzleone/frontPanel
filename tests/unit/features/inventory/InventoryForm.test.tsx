import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InventoryForm } from '../../../../src/features/inventory/components/InventoryForm'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../src/i18n'

describe('InventoryForm', () => {
  it('debe renderizar el formulario correctamente', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <InventoryForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      </I18nextProvider>
    )
    expect(screen.getByText(/nombre/i)).toBeInTheDocument()
    expect(screen.getByText(/unidad/i)).toBeInTheDocument()
  })
})
