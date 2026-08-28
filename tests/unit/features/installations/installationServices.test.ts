import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildInstallationUpdateDto,
  commitInstallationImport,
  downloadInstallationImportErrors,
  downloadInstallationTemplate,
  fetchInstallations,
  getInstallationImportStatus,
  previewInstallationImport,
  updateInstallation,
} from '../../../../src/features/installations/services/installationServices'
import { isOfflineError } from '../../../../src/shared/utils/errorHelpers'

vi.mock('../../../../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ role: 'admin' }),
  },
}))

vi.mock('../../../../src/shared/utils/apiHeaders', () => ({
  getAuthHeaders: () => ({}),
  getHeadersWithContentType: () => ({}),
  fetchWithCsrf: (url: string, options: RequestInit) => fetch(url, options),
  fetchWithAuthRetry: (url: string, options: RequestInit) => fetch(url, options),
}))

const downloadResponse = vi.hoisted(() => vi.fn())
vi.mock('../../../../src/shared/utils/downloadResponse', () => ({ downloadResponse }))

describe('installationServices', () => {
  beforeEach(() => {
    import.meta.env.VITE_API_URL = '/api/'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [], pagination: {} }),
    }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('serializes search and installation type filters', async () => {
    await fetchInstallations({ page: 2, limit: 4, search: 'north wing', category: 'Hospital' })

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('page=2')
    expect(String(url)).toContain('limit=4')
    expect(String(url)).toContain('search=north+wing')
    expect(String(url)).toContain('category=Hospital')
  })

  it('builds an installation update DTO from editable fields only', () => {
    const dto = buildInstallationUpdateDto({
      company: 'Central Plant',
      address: 'Main Street 123',
      installationType: 'Industrial',
      floorSector: 'Floor 2',
      postalCode: '1000',
      city: 'Buenos Aires',
      province: 'Buenos Aires',
      _id: 'server-id',
      tenantId: 'tenant-id',
      image: 'data:image/jpeg;base64,large',
      devices: [{ maintenanceHistory: [{ signature: 'data:image/png;base64,large' }] }],
      documents: [{ url: 'server-owned' }],
      createdBy: 'user-id',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })

    expect(dto).toEqual({
      company: 'Central Plant',
      address: 'Main Street 123',
      installationType: 'Industrial',
      floorSector: 'Floor 2',
      postalCode: '1000',
      city: 'Buenos Aires',
      province: 'Buenos Aires',
    })
  })

  it('sends only the installation update DTO', async () => {
    await updateInstallation('installation-id', {
      company: 'Central Plant',
      address: 'Main Street 123',
      installationType: 'Industrial',
      floorSector: 'Floor 2',
      postalCode: '1000',
      city: 'Buenos Aires',
      province: 'Buenos Aires',
      _id: 'server-id',
      devices: [{ evidence: 'data:image/jpeg;base64,large' }],
      maintenanceHistory: [{ signature: 'data:image/png;base64,large' }],
      documents: [{ name: 'server-owned' }],
      tenantId: 'tenant-id',
      createdBy: 'user-id',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      image: 'data:image/jpeg;base64,large',
    })

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toBe('/api/installations/installation-id')
    expect(JSON.parse(String(options?.body))).toEqual({
      company: 'Central Plant',
      address: 'Main Street 123',
      installationType: 'Industrial',
      floorSector: 'Floor 2',
      postalCode: '1000',
      city: 'Buenos Aires',
      province: 'Buenos Aires',
    })
  })

  it('preserves HTTP status and API message for update failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: 'Datos de instalación inválidos' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )))

    await expect(updateInstallation('installation-id', {
      company: 'Central Plant',
      address: 'Main Street 123',
      installationType: 'Industrial',
    })).rejects.toMatchObject({
      status: 400,
      message: 'Datos de instalación inválidos',
    })
  })

  it('does not classify a real HTTP 503 response as an offline transport failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: 'Servicio temporalmente no disponible' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )))

    const error = await updateInstallation('installation-id', {
      company: 'Central Plant',
      address: 'Main Street 123',
      installationType: 'Industrial',
    }).catch((caught: unknown) => caught)

    expect(error).toMatchObject({ status: 503, message: 'Servicio temporalmente no disponible' })
    expect(isOfflineError(error)).toBe(false)
  })

  it('uses the installation CSV template and error download contracts', async () => {
    await downloadInstallationTemplate()
    await downloadInstallationImportErrors('opaque/token')

    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe('/api/installations/csv/template')
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toBe('/api/installations/csv/import/opaque%2Ftoken/errors')
    expect(downloadResponse).toHaveBeenNthCalledWith(1, expect.anything(), 'Error al descargar la plantilla', 'installations-template.csv')
    expect(downloadResponse).toHaveBeenNthCalledWith(2, expect.anything(), 'Error al descargar los errores', 'installations-import-errors.csv')
  })

  it('previews with multipart CSV and commits using the preview token as the idempotency key', async () => {
    const preview = {
      token: 'preview-token', payloadHash: 'payload-hash', schemaVersion: 'installations.v1' as const,
      delimiter: ',' as const, expiresAt: '2030-01-01T00:00:00.000Z', counts: { create: 1, update: 0, unchanged: 0, error: 0 }, rows: [],
    }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(preview) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ create: 1 }) }))

    const result = await previewInstallationImport(new File(['csv'], 'installations.csv', { type: 'text/csv' }))
    await commitInstallationImport(result)

    const [previewUrl, previewOptions] = vi.mocked(fetch).mock.calls[0]
    expect(String(previewUrl)).toBe('/api/installations/csv/import/preview')
    expect(previewOptions?.method).toBe('POST')
    expect(previewOptions?.body).toBeInstanceOf(FormData)
    const [commitUrl, commitOptions] = vi.mocked(fetch).mock.calls[1]
    expect(String(commitUrl)).toBe('/api/installations/csv/import/commit')
    expect(commitOptions?.headers).toEqual({ 'Content-Type': 'application/json', 'Idempotency-Key': 'preview-token' })
    expect(JSON.parse(String(commitOptions?.body))).toEqual({ token: 'preview-token', payloadHash: 'payload-hash' })
  })

  it('queries import status with an encoded actor-bound session token', async () => {
    await getInstallationImportStatus('opaque/token')
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe('/api/installations/csv/import/opaque%2Ftoken')
  })
})
