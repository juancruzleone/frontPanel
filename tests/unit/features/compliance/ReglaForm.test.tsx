import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../src/i18n'
import { ReglaForm } from '../../../../src/features/compliance/components/ReglaForm'
import { ReglasList } from '../../../../src/features/compliance/components/ReglasList'
import type { Norma, Regla } from '../../../../src/features/compliance/services/complianceTypes'

const normas: Norma[] = [
  { _id: 'n1', codigo: 'IRAM 3517', familiaNorma: 'IRAM', activa: true },
  { _id: 'n2', codigo: 'AEA 90364', familiaNorma: 'AEA', activa: true },
]

const regla: Regla = {
  _id: 'r1', normaId: 'n1', nombre: 'Recarga cada 5 años', operador: 'fechaAntiguaMeses',
  parametros: { meses: 60 }, objetivoTipo: 'activo', campoNombre: 'fechaRecarga',
  etiquetaCampoSnapshot: 'Fecha de recarga', habilitada: true,
}

const renderForm = (props: Partial<React.ComponentProps<typeof ReglaForm>> = {}) =>
  render(
    <I18nextProvider i18n={i18n}>
      <ReglaForm normas={normas} onSubmit={vi.fn()} onCancel={vi.fn()} {...props} />
    </I18nextProvider>,
  )

describe('ReglaForm', () => {
  it('valida los campos obligatorios antes de enviar', async () => {
    const onSubmit = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <ReglaForm normas={normas} onSubmit={onSubmit} onCancel={vi.fn()} />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => {
      expect(screen.getByText(/El nombre es obligatorio|The name is required/)).toBeInTheDocument()
      expect(screen.getByText(/Seleccioná una norma|Select a standard/)).toBeInTheDocument()
      expect(screen.getByText(/Seleccioná un operador|Select an operator/)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envía la regla con los parámetros construidos para el operador', async () => {
    const onSubmit = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <ReglaForm normas={normas} onSubmit={onSubmit} onCancel={vi.fn()} />
      </I18nextProvider>,
    )

    fireEvent.change(screen.getByLabelText(/Nombre|Name/), { target: { value: 'Recarga' } })
    fireEvent.change(screen.getByLabelText(/Norma|Standard/), { target: { value: 'n1' } })
    fireEvent.change(screen.getByLabelText(/Operador/), { target: { value: 'numericoRango' } })
    fireEvent.change(screen.getByLabelText(/Tipo de objetivo|Objective type/), { target: { value: 'activo' } })
    fireEvent.change(screen.getByLabelText(/Mínimo|Minimum/), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/Máximo|Maximum/), { target: { value: '10' } })

    fireEvent.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Recarga',
          normaId: 'n1',
          operador: 'numericoRango',
          objetivoTipo: 'activo',
          parametros: { min: 0, max: 10 },
        }),
      )
    })
  })

  it('muestra los campos de parámetros según el operador seleccionado', async () => {
    renderForm()

    expect(screen.queryByLabelText(/Meses|Months/)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Operador/), { target: { value: 'fechaAntiguaMeses' } })
    expect(screen.getByLabelText(/Meses|Months/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Mínimo|Minimum/)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Operador/), { target: { value: 'enumEn' } })
    expect(screen.getByLabelText(/Valores|Values/)).toBeInTheDocument()
  })

  it('valida los parámetros del operador', async () => {
    const onSubmit = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <ReglaForm normas={normas} onSubmit={onSubmit} onCancel={vi.fn()} />
      </I18nextProvider>,
    )

    fireEvent.change(screen.getByLabelText(/Nombre|Name/), { target: { value: 'Recarga' } })
    fireEvent.change(screen.getByLabelText(/Norma|Standard/), { target: { value: 'n1' } })
    fireEvent.change(screen.getByLabelText(/Operador/), { target: { value: 'fechaAntiguaMeses' } })
    fireEvent.change(screen.getByLabelText(/Tipo de objetivo|Objective type/), { target: { value: 'activo' } })
    fireEvent.change(screen.getByLabelText(/Meses|Months/), { target: { value: 'abc' } })

    fireEvent.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => {
      expect(screen.getByText(/mayor a cero|greater than zero/)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('precarga los datos existentes al editar', () => {
    renderForm({ initialData: regla })

    expect(screen.getByLabelText(/Nombre|Name/)).toHaveValue('Recarga cada 5 años')
    expect(screen.getByLabelText(/Norma|Standard/)).toHaveValue('n1')
    expect(screen.getByLabelText(/Meses|Months/)).toHaveValue(60)
    expect(screen.getByLabelText(/Campo de evidencia|Evidence field/)).toHaveValue('fechaRecarga')
  })
})

describe('ReglasList', () => {
  it('muestra las reglas con nombre, operador y tipo de objetivo', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ReglasList reglas={[{ ...regla, habilitada: false }]} normas={normas} isAdmin={false} onEdit={vi.fn()} onDelete={vi.fn()} />
      </I18nextProvider>,
    )

    expect(screen.getByText('Recarga cada 5 años')).toBeInTheDocument()
    expect(screen.getByText(/Fecha antigua|Old date/)).toBeInTheDocument()
    expect(screen.getByText(/Activo|Asset/)).toBeInTheDocument()
  })

  it('no muestra acciones para técnicos y sí para admins', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    const { unmount } = render(
      <I18nextProvider i18n={i18n}>
        <ReglasList reglas={[regla]} normas={normas} isAdmin={false} onEdit={onEdit} onDelete={onDelete} />
      </I18nextProvider>,
    )
    expect(screen.queryByRole('button', { name: /Editar|Edit/ })).not.toBeInTheDocument()
    unmount()

    render(
      <I18nextProvider i18n={i18n}>
        <ReglasList reglas={[regla]} normas={normas} isAdmin onEdit={onEdit} onDelete={onDelete} />
      </I18nextProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Editar|Edit/ }))
    expect(onEdit).toHaveBeenCalledWith(regla)
    fireEvent.click(screen.getByRole('button', { name: /Eliminar|Delete/ }))
    expect(onDelete).toHaveBeenCalledWith(regla)
  })
})