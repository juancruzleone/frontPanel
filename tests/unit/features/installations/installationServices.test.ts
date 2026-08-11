import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildInstallationUpdateDto,
  fetchInstallations,
  updateInstallation,
} from '../../../../src/features/installations/services/installationServices'

vi.mock('../../../../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ role: 'admin' }),
  },
}))

vi.mock('../../../../src/shared/utils/apiHeaders', () => ({
  getAuthHeaders: () => ({}),
  getHeadersWithContentType: () => ({}),
  fetchWithCsrf: (url: string, options: RequestInit) => fetch(url, options),
}))

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
})
