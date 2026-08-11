import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Suppliers from '../../../src/pages/Suppliers'
import { useSuppliers } from '../../../src/features/suppliers/hooks/useSuppliers'
import { useAuthStore } from '../../../src/store/authStore'

vi.mock('../../../src/features/suppliers/hooks/useSuppliers')
vi.mock('../../../src/features/suppliers/hooks/useSuppliersTour', () => ({
  useSuppliersTour: () => ({
    tourCompleted: true,
    startTour: vi.fn(),
    skipTour: vi.fn(),
  }),
}))
vi.mock('../../../src/shared/hooks/useResponsiveView', () => ({
  useResponsiveView: () => ['cards', vi.fn(), false],
}))
vi.mock('../../../src/shared/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' }),
}))
vi.mock('../../../src/shared/components/SuccessModal', () => ({
  default: ({
    isOpen,
    onRequestClose,
    title,
    message,
    buttonText,
  }: {
    isOpen: boolean
    onRequestClose: () => void
    title: string
    message: string
    buttonText?: string
  }) => isOpen ? (
    <div data-testid="canonical-success-modal">
      <h2>{title}</h2>
      <p>{message}</p>
      <button onClick={onRequestClose}>{buttonText}</button>
    </div>
  ) : null,
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const supplier = {
  _id: 'supplier-1',
  name: 'Proveedor original',
  email: 'original@example.com',
}

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

describe('Suppliers page', () => {
  const loadSuppliers = vi.fn().mockResolvedValue(undefined)
  const addSupplier = vi.fn()
  const updateSupplier = vi.fn()
  const removeSupplier = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ role: 'admin' })
    vi.mocked(useSuppliers).mockReturnValue({
      suppliers: [supplier],
      total: 1,
      loading: false,
      error: null,
      loadSuppliers,
      addSupplier,
      updateSupplier,
      removeSupplier,
    })
  })

  it('muestra éxito sólo después de confirmar la edición y limpia el modal editado', async () => {
    const deferredUpdate = createDeferred<typeof supplier>()
    updateSupplier.mockReturnValueOnce(deferredUpdate.promise)
    render(<Suppliers />)

    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }))
    fireEvent.change(screen.getByLabelText('suppliers.name *'), {
      target: { value: 'Proveedor actualizado' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => expect(updateSupplier).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('common.successTitle')).not.toBeInTheDocument()
    expect(screen.getByText('suppliers.editSupplier')).toBeInTheDocument()

    deferredUpdate.resolve({ ...supplier, name: 'Proveedor actualizado' })

    expect(await screen.findByText('suppliers.supplierUpdated')).toBeInTheDocument()
    expect(screen.getByTestId('canonical-success-modal')).toBeInTheDocument()
    expect(screen.getByText('common.successTitle')).toBeInTheDocument()
    expect(screen.queryByText('suppliers.editSupplier')).not.toBeInTheDocument()
    expect(loadSuppliers).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'common.understood' }))
    expect(screen.queryByText('common.successTitle')).not.toBeInTheDocument()
    expect(screen.queryByText('suppliers.supplierUpdated')).not.toBeInTheDocument()
  })

  it('mantiene la edición abierta y no muestra éxito cuando la operación falla', async () => {
    const deferredUpdate = createDeferred<typeof supplier>()
    updateSupplier.mockReturnValueOnce(deferredUpdate.promise)
    render(<Suppliers />)

    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    deferredUpdate.reject(new Error('No se pudo actualizar'))

    expect(await screen.findByText('No se pudo actualizar')).toBeInTheDocument()
    expect(screen.getByText('suppliers.editSupplier')).toBeInTheDocument()
    expect(screen.queryByText('common.successTitle')).not.toBeInTheDocument()
  })

  it('muestra éxito sólo después de confirmar la eliminación y limpia la selección', async () => {
    const deferredRemoval = createDeferred<void>()
    removeSupplier.mockReturnValueOnce(deferredRemoval.promise)
    render(<Suppliers />)

    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'common.delete' }).at(-1)!)

    await waitFor(() => expect(removeSupplier).toHaveBeenCalledWith(supplier._id))
    expect(screen.getByRole('button', { name: 'common.deleting' })).toBeDisabled()
    expect(screen.getByText('suppliers.deleteSupplier')).toBeInTheDocument()
    expect(screen.queryByText('common.successTitle')).not.toBeInTheDocument()

    deferredRemoval.resolve()

    expect(await screen.findByText('suppliers.supplierDeleted')).toBeInTheDocument()
    expect(screen.getByText('common.successTitle')).toBeInTheDocument()
    expect(screen.queryByText('suppliers.deleteSupplier')).not.toBeInTheDocument()
    expect(loadSuppliers).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'common.understood' }))
    expect(screen.queryByText('suppliers.supplierDeleted')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    expect(screen.getByText('suppliers.deleteSupplier')).toBeInTheDocument()
    expect(screen.queryByText('common.successTitle')).not.toBeInTheDocument()
  })

  it('mantiene la confirmación sin éxito y limpia su error al cerrar una eliminación fallida', async () => {
    removeSupplier.mockRejectedValueOnce(new Error('No se pudo eliminar'))
    render(<Suppliers />)

    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'common.delete' }).at(-1)!)

    expect(await screen.findByText('No se pudo eliminar')).toBeInTheDocument()
    expect(screen.getByText('suppliers.deleteSupplier')).toBeInTheDocument()
    expect(screen.queryByText('common.successTitle')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))

    expect(screen.getByText('suppliers.deleteSupplier')).toBeInTheDocument()
    expect(screen.queryByText('No se pudo eliminar')).not.toBeInTheDocument()
    expect(screen.queryByText('common.successTitle')).not.toBeInTheDocument()
  })

  it('mantiene aislado el éxito de creación frente a los demás modales', async () => {
    const deferredCreation = createDeferred<typeof supplier>()
    addSupplier.mockReturnValueOnce(deferredCreation.promise)
    render(<Suppliers />)

    fireEvent.click(screen.getByRole('button', { name: 'suppliers.addSupplier' }))
    fireEvent.change(screen.getByLabelText('suppliers.name *'), {
      target: { value: 'Proveedor nuevo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => expect(addSupplier).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('heading', { name: 'suppliers.addSupplier' })).toBeInTheDocument()
    expect(screen.queryByText('common.successTitle')).not.toBeInTheDocument()

    deferredCreation.resolve({ ...supplier, _id: 'supplier-2', name: 'Proveedor nuevo' })

    expect(await screen.findByText('suppliers.supplierAdded')).toBeInTheDocument()
    expect(screen.queryByText('suppliers.editSupplier')).not.toBeInTheDocument()
    expect(screen.queryByText('suppliers.deleteSupplier')).not.toBeInTheDocument()
  })
})
