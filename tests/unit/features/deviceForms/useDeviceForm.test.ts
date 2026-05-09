import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useDeviceForm from '../../../../src/features/deviceForms/hooks/useDeviceForm'
import * as services from '../../../../src/features/deviceForms/services/deviceFormService'

vi.mock('../../../../src/features/deviceForms/services/deviceFormService', () => ({
  fetchDeviceForm: vi.fn(),
  submitDeviceMaintenance: vi.fn(),
}))

describe('useDeviceForm concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.stubGlobal('navigator', { onLine: true })
    
    // Mock fetchDeviceForm to prevent errors on mount
    vi.mocked(services.fetchDeviceForm).mockResolvedValue({
      data: {
        deviceInfo: {},
        installationInfo: {},
        formFields: []
      }
    })
  })

  it('debe prevenir ejecuciones concurrentes de syncPendingSubmissions', async () => {
    const pendingSubmissions = [
      {
        id: '1',
        installationId: 'inst-1',
        deviceId: 'dev-1',
        formData: { test: 1 },
        timestamp: Date.now(),
        retryCount: 0
      }
    ]
    
    localStorage.setItem('pendingMaintenanceSubmissions', JSON.stringify(pendingSubmissions))

    // Empezamos offline para evitar el sync automático del useEffect
    vi.stubGlobal('navigator', { onLine: false })

    let resolveSubmission: (value: any) => void = () => {}
    const submissionPromise = new Promise((resolve) => {
      resolveSubmission = resolve
    })

    vi.mocked(services.submitDeviceMaintenance).mockImplementation(() => submissionPromise)

    const { result, rerender } = renderHook(() => useDeviceForm('inst-1', 'dev-1'))

    // Esperar a que se carguen los pendientes
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.pendingSubmissions.length).toBe(1)
    expect(services.submitDeviceMaintenance).not.toHaveBeenCalled()

    // Ponemos online
    vi.stubGlobal('navigator', { onLine: true })
    // Forzamos que el hook se entere del cambio (normalmente sería por el event listener)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })

    // Ahora el useEffect debería haber disparado el primer sync (automático)
    // Pero como submitDeviceMaintenance está bloqueado por submissionPromise,
    // isSyncingRef.current debería ser true.

    // Intentamos disparar uno manual
    let manualSyncFinished = false
    await act(async () => {
      await result.current.syncPendingSubmissions()
      manualSyncFinished = true
    })

    // El manual debería terminar inmediatamente por el guard
    expect(manualSyncFinished).toBe(true)
    expect(services.submitDeviceMaintenance).toHaveBeenCalledTimes(1)

    // Resolvemos la sumisión bloqueada
    await act(async () => {
      resolveSubmission({ success: true })
      // Esperamos a que termine el sync automático (que está en vuelo)
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    // Verificamos que no se llamó más veces de lo esperado
    expect(services.submitDeviceMaintenance).toHaveBeenCalledTimes(1)
  })
})
