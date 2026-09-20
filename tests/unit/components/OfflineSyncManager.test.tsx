/**
 * OfflineSyncManager wired to syncCoordinator: reconnect dedup, retry, cleanup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let isNavigatorOnline = true
Object.defineProperty(navigator, 'onLine', {
  configurable: true,
  get: () => isNavigatorOnline,
})

const translations: Record<string, string> = {
  'offline.syncStatus': 'Estado de sincronización',
  'offline.closeNotification': 'Cerrar notificación de sincronización',
  'offline.connectionOffline': 'Sin conexión',
  'offline.offlineDescription': 'Puedes seguir trabajando. Los cambios que hagas se guardarán en este dispositivo y se enviarán cuando vuelva la conexión.',
  'offline.offlineWithPendingDescription': 'Tus cambios están guardados en este dispositivo y se enviarán automáticamente cuando vuelva la conexión.',
  'offline.pendingChanges': 'Cambios pendientes de enviar',
  'offline.pendingChangesDescription': 'Hay cambios guardados en este dispositivo. Se enviarán automáticamente en cuanto sea posible.',
  'offline.syncAttentionRequired': 'La sincronización requiere atención',
  'offline.syncIssuesDescription': 'Algunos cambios sin conexión deben revisarse antes de finalizar la sincronización.',
  'offline.syncComplete': 'Sincronización completada',
  'offline.syncCompleteDescription': 'Todos los cambios pendientes están actualizados.',
  'offline.syncInProgress': 'Sincronizando cambios',
  'offline.syncInProgressDescription': 'Tus cambios sin conexión se están enviando de forma segura.',
  'offline.leaseExpired': 'La autorización sin conexión venció.',
  'offline.leaseRevoked': 'El acceso sin conexión fue revocado.',
  'offline.offlineUnavailable': 'La sincronización sin conexión no está disponible.',
  'offline.conflicts': 'Conflictos: {{count}}',
  'offline.deadLetters': 'Elementos no procesables: {{count}}',
  'offline.viewConflicts': 'Ver conflictos',
  'offline.viewDeadLetters': 'Ver elementos no procesables',
  'offline.syncNow': 'Sincronizar ahora',
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => (translations[key] ?? key).replace('{{count}}', String(options?.count ?? '')),
  }),
}))

const mockState = vi.hoisted(() => ({
  auth: { isAuthenticated: true, isAuthResolved: true, userId: 'u1' } as Record<string, unknown>,
  trust: { isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' } as Record<string, unknown>,
  offline: { queue: [] } as { queue: Array<{ userId?: string | null }> },
}))

vi.mock('../../../src/store/authStore', () => ({
  useAuthStore: Object.assign(
    (sel: (s: Record<string, unknown>) => unknown) => sel(mockState.auth),
    { getState: () => mockState.auth },
  ),
}))
vi.mock('../../../src/store/offlineTrustStore', () => ({
  useOfflineTrustStore: (sel: (s: Record<string, unknown>) => unknown) => sel(mockState.trust),
}))
vi.mock('../../../src/store/offlineStore', () => ({
  useOfflineStore: (sel: (s: typeof mockState.offline) => unknown) => sel(mockState.offline),
}))

const resolveSyncContextMock = vi.fn()
const runSyncCycleMock = vi.fn()
const getConflictItemsMock = vi.fn()
const initializeLegacySyncMock = vi.fn()
const syncLegacyQueueMock = vi.fn()
vi.mock('../../../src/shared/offline/syncCoordinator', () => ({
  resolveSyncContext: (...args: unknown[]) => resolveSyncContextMock(...args),
  runSyncCycle: (...args: unknown[]) => runSyncCycleMock(...args),
}))
vi.mock('../../../src/shared/offline/conflictAggregator', () => ({
  getConflictItems: (...args: unknown[]) => getConflictItemsMock(...args),
}))
vi.mock('../../../src/shared/services/offlineSyncService', () => ({
  offlineSyncService: { initialize: initializeLegacySyncMock, syncAll: syncLegacyQueueMock },
}))

const { OfflineSyncManager } = await import('../../../src/shared/components/OfflineSyncManager')

describe('OfflineSyncManager → coordinator', () => {
  beforeEach(() => {
    isNavigatorOnline = true
    localStorage.clear()
    Object.assign(mockState.auth, { isAuthenticated: true, isAuthResolved: true, userId: 'u1'})
    Object.assign(mockState.trust, { isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid'})
    mockState.offline.queue = []
    resolveSyncContextMock.mockReset()
    runSyncCycleMock.mockReset()
    getConflictItemsMock.mockReset()
    initializeLegacySyncMock.mockReset()
    syncLegacyQueueMock.mockReset()
    resolveSyncContextMock.mockResolvedValue({ ctx: { tenantId: 't1', actorId: 'a1', deviceId: 'dev-1', packages: [] }})
    runSyncCycleMock.mockResolvedValue({ phase: 'complete', packages: [], totalPending: 0, totalConflicted: 0, totalDeadLettered: 0, lastSyncAt: Date.now()})
    getConflictItemsMock.mockResolvedValue([])
 })
  afterEach(() => { cleanup()})

  it('stays hidden while online with no pending work', async () => {
    render(<OfflineSyncManager />)

    await waitFor(() => expect(runSyncCycleMock).toHaveBeenCalledOnce())
    expect(document.querySelector('[data-offline-sync-notification]')).toBeNull()
  })

  it('renders no sync UI for anonymous users', () => {
    Object.assign(mockState.auth, { isAuthenticated: false, isAuthResolved: true, userId: null })
    const { container } = render(<OfflineSyncManager />)

    expect(container).toBeEmptyDOMElement()
    expect(initializeLegacySyncMock).not.toHaveBeenCalled()
    expect(syncLegacyQueueMock).not.toHaveBeenCalled()
  })

  it('initializes and attempts replay for mutations queued by existing feature hooks', () => {
    render(<OfflineSyncManager />)

    expect(initializeLegacySyncMock).toHaveBeenCalledOnce()
    expect(syncLegacyQueueMock).toHaveBeenCalledOnce()
  })

  it('does not show a capability warning when online with no pending work', () => {
    Object.assign(mockState.trust, { isOfflineReady: true, leaseStatus: 'expired'})
    render(<OfflineSyncManager />)

    expect(document.querySelector('[data-offline-sync-notification]')).toBeNull()
  })

  it('dismisses the current incident and returns after connection recovery', async () => {
    const view = render(<OfflineSyncManager />)
    isNavigatorOnline = false
    fireEvent.offline(window)

    fireEvent.click(screen.getByLabelText('Cerrar notificación de sincronización'))
    expect(document.querySelector('[data-offline-sync-notification]')).toBeNull()

    view.rerender(<OfflineSyncManager />)
    expect(document.querySelector('[data-offline-sync-notification]')).toBeNull()

    isNavigatorOnline = true
    fireEvent.online(window)
    await waitFor(() => expect(localStorage.getItem('offline-sync-dismissed:u1:dev-1')).toBeNull())
    isNavigatorOnline = false
    fireEvent.offline(window)

    expect(document.querySelectorAll('[data-offline-sync-notification]')).toHaveLength(1)
    expect(screen.getByLabelText('Estado de sincronización')).toHaveTextContent('Sin conexión')
    expect(screen.getByLabelText('Cerrar notificación de sincronización')).toBeTruthy()
  })

  it('keeps the same offline incident dismissed after a reload', () => {
    const firstLoad = render(<OfflineSyncManager />)
    isNavigatorOnline = false
    fireEvent.offline(window)

    fireEvent.click(screen.getByLabelText('Cerrar notificación de sincronización'))
    firstLoad.unmount()
    render(<OfflineSyncManager />)

    expect(document.querySelector('[data-offline-sync-notification]')).toBeNull()
  })

  it('does not show a notice for the automatic online sync after a reload', async () => {
    render(<OfflineSyncManager />)

    await waitFor(() => expect(runSyncCycleMock).toHaveBeenCalledOnce())
    expect(document.querySelector('[data-offline-sync-notification]')).toBeNull()
  })

  it('shows a clear, non-alarming notice when the browser detects a real connection loss', () => {
    render(<OfflineSyncManager />)

    isNavigatorOnline = false
    fireEvent.offline(window)

    const status = screen.getByLabelText('Estado de sincronización')
    expect(status).toHaveTextContent('Sin conexión')
    expect(status).toHaveTextContent('Puedes seguir trabajando')
    expect(screen.queryByLabelText('Sincronizar ahora')).not.toBeInTheDocument()
  })

  it('shows a pending-upload notice while online when the current user has queued work', () => {
    mockState.offline.queue = [{ userId: 'u1' }]
    render(<OfflineSyncManager />)

    const status = screen.getByLabelText('Estado de sincronización')
    expect(status).toHaveTextContent('Cambios pendientes de enviar')
    expect(status).toHaveTextContent('Se enviarán automáticamente en cuanto sea posible')
    expect(screen.getByLabelText('Sincronizar ahora')).toHaveTextContent('Sincronizar ahora')
  })

  it('uses one alert surface for paused, conflict, and dead-letter states', async () => {
    runSyncCycleMock.mockResolvedValue({
      phase: 'complete',
      packages: [],
      totalPending: 0,
      totalConflicted: 2,
      totalDeadLettered: 1,
      lastSyncAt: Date.now(),
    })
    render(<OfflineSyncManager />)

    await screen.findByLabelText('Ver conflictos')
    const notifications = document.querySelectorAll('[data-offline-sync-notification]')
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toHaveTextContent('La sincronización requiere atención')
    expect(screen.getByLabelText('Ver conflictos')).toHaveTextContent('Conflictos: 2')
    expect(screen.getByLabelText('Ver elementos no procesables')).toHaveTextContent('Elementos no procesables: 1')
    expect(screen.getByLabelText('Sincronizar ahora')).toBeTruthy()
  })

  it('stays hidden when offline support is unavailable but there is no pending work', () => {
    Object.assign(mockState.trust, { isOfflineReady: false })
    render(<OfflineSyncManager />)
    expect(document.querySelector('[data-offline-sync-notification]')).toBeNull()
  })

  it('cleans up on unmount', () => {
    const { unmount } = render(<OfflineSyncManager />)
    expect(() => unmount()).not.toThrow()
 })

  it('does not render sensitive data', () => {
    render(<OfflineSyncManager />)
    isNavigatorOnline = false
    fireEvent.offline(window)
    expect(document.body.innerHTML).not.toContain('password')
    expect(document.body.innerHTML).not.toContain('secret')
  })

  it('has accessible live region when paused', () => {
    render(<OfflineSyncManager />)
    isNavigatorOnline = false
    fireEvent.offline(window)
    const el = document.querySelector('[role="status"]')
    expect(el).toBeTruthy()
    expect(el?.getAttribute('aria-live')).toBe('polite')
    expect(el).not.toHaveAttribute('style')
    expect(el?.className).toBeTruthy()
  })

  it('uses one CSS-module surface without legacy cards or inline positioning', () => {
    const component = readFileSync(resolve(process.cwd(), 'src/shared/components/OfflineSyncManager.tsx'), 'utf8')
    const css = readFileSync(resolve(process.cwd(), 'src/shared/components/OfflineSyncManager.module.css'), 'utf8')

    expect(component).not.toContain('styles.card')
    expect(component).not.toContain('style={{')
    expect(css).not.toMatch(/\.card\s*{/)
    expect(css).toMatch(/\.notice\s*{[^}]*position:\s*fixed/s)
    expect(css).toMatch(/\.actions\s*{[^}]*justify-content:\s*flex-start/s)
    expect(css).not.toContain('border-left')
    expect(css).not.toContain('linear-gradient')
    expect(css).toMatch(/\.notice\s*{[^}]*border-radius:\s*9px/s)
    expect(css).toMatch(/\.actionButton\s*{[^}]*border-radius:\s*6px/s)
    expect(css).toMatch(/\.closeButton\s*{[^}]*width:\s*40px[^}]*height:\s*40px/s)
    expect(css).toMatch(/\.paused\s*{[^}]*--notice-icon-bg:\s*rgba\(5, 126, 116, 0\.12\)[^}]*--notice-icon-color:\s*var\(--color-secondary\)/s)
    expect(css).toMatch(/\[data-theme='dark'\]\) \.paused\s*{[^}]*--notice-icon-bg:\s*rgba\(45, 212, 191, 0\.14\)[^}]*--notice-icon-color:\s*#5eead4/s)
  })

  it('keeps the notice above the TourButton footprint', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/shared/components/OfflineSyncManager.module.css'), 'utf8')
    const clearance = css.match(/--tour-button-clearance:\s*(\d+)px/)?.[1]

    expect(clearance).toBeDefined()
    expect(Number(clearance)).toBeGreaterThan(30 + 60)
    expect(css).toContain('env(safe-area-inset-bottom, 0px)')
  })
})
