import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../src/i18n'
import { NormaForm } from '../../../../src/features/compliance/components/NormaForm'
import { NormasList } from '../../../../src/features/compliance/components/NormasList'
import type { Norma } from '../../../../src/features/compliance/services/complianceTypes'

const norma: Norma = {
  _id: 'n1', codigo: 'IRAM 3517', familiaNorma: 'IRAM',
  descripcion: 'Recarga de extintores', activa: true,
}

describe('NormaForm', () => {
  it('valida campos obligatorios antes de enviar', async () => {
    const onSubmit = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <NormaForm onSubmit={onSubmit} onCancel={vi.fn()} />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => {
      expect(screen.getByText(/El código es obligatorio|The code is required/)).toBeInTheDocument()
      expect(screen.getByText(/familia de norma es obligatoria|standard family is required/)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envía los datos del formulario al enviar', async () => {
    const onSubmit = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <NormaForm onSubmit={onSubmit} onCancel={vi.fn()} />
      </I18nextProvider>,
    )

    fireEvent.change(screen.getByLabelText(/Código|Code/), { target: { value: 'AEA 90364' } })
    fireEvent.change(screen.getByLabelText(/Familia|family/), { target: { value: 'AEA' } })

    fireEvent.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: 'AEA 90364', familiaNorma: 'AEA', activa: true }),
      )
    })
  })

  it('precarga los datos existentes al editar', async () => {
    const onSubmit = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <NormaForm initialData={norma} onSubmit={onSubmit} onCancel={vi.fn()} />
      </I18nextProvider>,
    )

    expect(screen.getByLabelText(/Código|Code/)).toHaveValue('IRAM 3517')
    expect(screen.getByLabelText(/Familia|family/)).toHaveValue('IRAM')
  })
})

describe('NormasList', () => {
  it('muestra las normas y sus campos', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <NormasList normas={[norma]} isAdmin={false} onEdit={vi.fn()} onDelete={vi.fn()} />
      </I18nextProvider>,
    )

    expect(screen.getByText('IRAM 3517')).toBeInTheDocument()
    expect(screen.getByText('IRAM')).toBeInTheDocument()
  })

  it('no muestra acciones de edición para técnicos', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <NormasList normas={[norma]} isAdmin={false} onEdit={vi.fn()} onDelete={vi.fn()} />
      </I18nextProvider>,
    )

    expect(screen.queryByRole('button', { name: /Editar|Edit/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Eliminar|Delete/ })).not.toBeInTheDocument()
  })

  it('muestra acciones de edición y eliminación para admins y las dispara', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <NormasList normas={[norma]} isAdmin onEdit={onEdit} onDelete={onDelete} />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Editar|Edit/ }))
    expect(onEdit).toHaveBeenCalledWith(norma)

    fireEvent.click(screen.getByRole('button', { name: /Eliminar|Delete/ }))
    expect(onDelete).toHaveBeenCalledWith(norma)
  })
})