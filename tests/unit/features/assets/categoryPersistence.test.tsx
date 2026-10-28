import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ModalManageAssetCategories from '../../../../src/features/settings/components/ModalManageAssetCategories'
import ModalManageFormCategories from '../../../../src/features/settings/components/ModalManageFormCategories'
import ModalManageDeviceCategories from '../../../../src/features/settings/components/ModalManageDeviceCategories'
import useAssets from '../../../../src/features/assets/hooks/useAssets'
import { useSettingsStore } from '../../../../src/store/settingsStore'
import { fetchWithAuthRetry, fetchWithCsrf } from '../../../../src/shared/utils/apiHeaders'
import * as assetServices from '../../../../src/features/assets/services/assetServices'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('../../../../src/store/authStore', () => ({
  useAuthStore: () => ({ userId: 'category-test-user', isAuthenticated: true }),
}))
vi.mock('../../../../src/utils/indexedDBStorage', () => ({
  indexedDBStorage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
}))
vi.mock('../../../../src/shared/utils/apiHeaders', () => ({
  fetchWithAuthRetry: vi.fn(), fetchWithCsrf: vi.fn(),
  getAuthHeaders: () => ({}), getHeadersWithContentType: () => ({}),
}))
vi.mock('../../../../src/features/assets/services/assetServices', () => ({
  fetchAssets: vi.fn(), fetchTemplates: vi.fn(), createAsset: vi.fn(), updateAsset: vi.fn(),
  deleteAsset: vi.fn(), assignTemplateToAsset: vi.fn(), updateAssetStock: vi.fn(),
}))

const initialCategory = { _id: 'form-category-id', nombre: 'Bombas', activa: true }
let records = [initialCategory]
let rejectMutation = false
let releaseMutation: (() => void) | undefined
let pauseMutation = false
const requests: { method: string; path: string; body: unknown }[] = []

beforeEach(() => {
  vi.clearAllMocks()
  useSettingsStore.getState().resetSettings()
  records = [{ ...initialCategory }]
  rejectMutation = false
  pauseMutation = false
  releaseMutation = undefined
  requests.length = 0
  vi.mocked(assetServices.fetchAssets).mockResolvedValue({ assets: [] })
  vi.mocked(assetServices.fetchTemplates).mockResolvedValue([
    { _id: 'template-1', nombre: 'Revisión', categoria: 'Bombas', campos: [] },
    { _id: 'template-2', nombre: 'Otro', categoria: 'Motores', campos: [] },
  ])
  vi.mocked(fetchWithAuthRetry).mockImplementation(async (input, init) => {
    const path = new URL(String(input), 'http://localhost').pathname
    const method = init?.method || 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    requests.push({ method, path, body })
    if (!path.startsWith('/api/categorias-formularios')) throw new Error(`Unexpected API: ${path}`)
    if (method === 'GET') return Response.json({ success: true, data: records })
    if (pauseMutation) await new Promise<void>(resolve => { releaseMutation = resolve })
    if (rejectMutation) return Response.json({ message: 'Rejected' }, { status: 409 })
    if (method === 'POST') {
      const created = { ...body, _id: 'created-form-id' }
      records = [...records, created]
      return Response.json({ success: true, data: created })
    }
    if (path !== '/api/categorias-formularios/form-category-id') throw new Error('Wrong category ID')
    if (method === 'PUT') records = records.map(item => ({ ...item, ...body }))
    if (method === 'DELETE') records = records.filter(item => item._id !== 'form-category-id')
    return Response.json({ success: true, data: { message: 'OK' } })
  })
})

const renderLegacy = async () => {
  render(<ModalManageAssetCategories isOpen onRequestClose={vi.fn()} />)
  await screen.findByText('Bombas')
}
const add = () => {
  fireEvent.change(screen.getByPlaceholderText('settings.newCategoryName'), { target: { value: '  Motores  ' } })
  fireEvent.keyPress(screen.getByPlaceholderText('settings.newCategoryName'), { key: 'Enter', charCode: 13 })
}
const edit = () => {
  fireEvent.click(screen.getByRole('button', { name: 'common.edit' }))
  fireEvent.change(screen.getByPlaceholderText('settings.categoryName'), { target: { value: '  Motores  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
}
const remove = () => {
  fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'common.delete' }).at(-1)!)
}
const mutationRequests = () => requests.filter(request => request.method !== 'GET')

describe('legacy asset category management uses the form category resource', () => {
  it('explains template inheritance and uses the form category heading', async () => {
    await renderLegacy()
    expect(screen.getByRole('heading', { name: 'settings.manageFormCategories' })).toBeInTheDocument()
    expect(screen.getByText('settings.assetCategoryInheritance')).toBeInTheDocument()
  })

  it('persists a trimmed create before clearing input or reporting success', async () => {
    pauseMutation = true
    await renderLegacy()
    add()
    await waitFor(() => expect(mutationRequests()).toEqual([
      { method: 'POST', path: '/api/categorias-formularios', body: { nombre: 'Motores', descripcion: '', activa: true } },
    ]))
    expect(screen.getByPlaceholderText('settings.newCategoryName')).toHaveValue('  Motores  ')
    expect(screen.queryByText('settings.success.categoryAdded')).not.toBeInTheDocument()
    await act(async () => { releaseMutation?.() })
    await screen.findByText('settings.success.categoryAdded')
    expect(screen.getByPlaceholderText('settings.newCategoryName')).toHaveValue('')
    expect(screen.getByText('Motores')).toBeInTheDocument()
  })

  it('updates using the server category ID, not a list index', async () => {
    await renderLegacy()
    edit()
    await screen.findByText('settings.success.categoryUpdated')
    expect(mutationRequests()).toEqual([
      { method: 'PUT', path: '/api/categorias-formularios/form-category-id', body: { nombre: 'Motores', activa: true } },
    ])
    expect(screen.queryByPlaceholderText('settings.categoryName')).not.toBeInTheDocument()
    expect(screen.getByText('Motores')).toBeInTheDocument()
    expect(screen.queryByText('Bombas')).not.toBeInTheDocument()
  })

  it('deletes using the server category ID and refreshes the list', async () => {
    await renderLegacy()
    remove()
    await screen.findByText('settings.success.categoryDeleted')
    expect(mutationRequests()).toEqual([
      { method: 'DELETE', path: '/api/categorias-formularios/form-category-id', body: undefined },
    ])
    expect(screen.queryByText('Bombas')).not.toBeInTheDocument()
    expect(screen.queryByText('settings.confirmDeleteTitle')).not.toBeInTheDocument()
  })

  it.each([
    ['create', add, 'settings.success.categoryAdded', 'Error al crear categoría'],
    ['update', edit, 'settings.success.categoryUpdated', 'Error al actualizar categoría'],
    ['delete', remove, 'settings.success.categoryDeleted', 'Error al eliminar categoría'],
  ] as const)('keeps data and pending input/confirmation when the API rejects %s', async (operation, trigger, success, error) => {
    rejectMutation = true
    await renderLegacy()
    const readsBefore = requests.filter(request => request.method === 'GET').length
    trigger()
    await screen.findByText(error, { exact: false })
    expect(mutationRequests()).toHaveLength(1)
    expect(screen.queryByText(success)).not.toBeInTheDocument()
    expect(screen.getByText('Bombas')).toBeInTheDocument()
    expect(screen.queryByText('Motores')).not.toBeInTheDocument()
    expect(requests.filter(request => request.method === 'GET')).toHaveLength(readsBefore)
    if (operation === 'create') expect(screen.getByPlaceholderText('settings.newCategoryName')).toHaveValue('  Motores  ')
    if (operation === 'update') expect(screen.getByPlaceholderText('settings.categoryName')).toHaveValue('  Motores  ')
    if (operation === 'delete') expect(screen.getByText('settings.confirmDeleteTitle')).toBeInTheDocument()
  })

  it('preserves existing form manager duplicate validation without a mutation', async () => {
    render(<ModalManageFormCategories isOpen onRequestClose={vi.fn()} />)
    await screen.findByText('Bombas')
    fireEvent.change(screen.getByPlaceholderText('settings.newCategoryName'), { target: { value: '  BOMBAS  ' } })
    fireEvent.keyPress(screen.getByPlaceholderText('settings.newCategoryName'), { key: 'Enter', charCode: 13 })
    expect(await screen.findByText('settings.validation.nameExists')).toBeInTheDocument()
    expect(mutationRequests()).toEqual([])
    expect(screen.getByPlaceholderText('settings.newCategoryName')).toHaveValue('  BOMBAS  ')
  })
})

describe('asset category consumers', () => {
  it('preserves device categories on the independent /categorias catalog', async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue(Response.json([{ _id: 'device-category-id', nombre: 'Válvulas' }]))
    render(<ModalManageDeviceCategories isOpen onRequestClose={vi.fn()} />)
    await screen.findByText('Válvulas')
    expect(screen.getByRole('heading', { name: 'settings.manageDeviceCategories' })).toBeInTheDocument()
    expect(fetchWithCsrf).toHaveBeenCalledWith('/api/categorias?includeInactive=true', { headers: {} })
    expect(fetchWithAuthRetry).not.toHaveBeenCalled()
    expect(screen.queryByText('Bombas')).not.toBeInTheDocument()
  })

  it('exposes explicit formCategories with the compatible categories alias', async () => {
    const { result } = renderHook(() => useAssets())
    await waitFor(() => expect(result.current.categories).toEqual(['Bombas']))
    expect(result.current.formCategories).toBe(result.current.categories)
  })

  it('preserves getTemplatesByCategory matching and empty results', async () => {
    const { result } = renderHook(() => useAssets())
    await waitFor(() => expect(result.current.getTemplatesByCategory('Bombas')).toEqual([
      { _id: 'template-1', nombre: 'Revisión', categoria: 'Bombas', campos: [] },
    ]))
    expect(result.current.getTemplatesByCategory('Missing')).toEqual([])
  })
})
