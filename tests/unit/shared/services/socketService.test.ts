import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const socketHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => void>())
const socketMock = vi.hoisted(() => ({
  connected: false,
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    socketHandlers.set(event, handler)
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
}))
const ioMock = vi.hoisted(() => vi.fn(() => socketMock))

vi.mock('socket.io-client', () => ({ io: ioMock }))

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('SocketService assigned-order fallback polling', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.stubEnv('VITE_SOCKET_URL', 'https://socket.test')
    vi.stubGlobal('fetch', vi.fn())
    socketHandlers.clear()
    socketMock.connected = false
    socketMock.on.mockClear()
    socketMock.emit.mockClear()
    socketMock.disconnect.mockClear()
    socketMock.disconnect.mockImplementation(() => {
      socketMock.connected = false
      socketHandlers.get('disconnect')?.()
    })
    ioMock.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('stops REST polling while the socket is connected and resumes after disconnect', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    const { useAuthStore } = await import('../../../../src/store/authStore')
    const { socketService } = await import('../../../../src/shared/services/socketService')
    useAuthStore.setState({ isAuthenticated: true, isAuthResolved: true, userId: 'tech-1', user: 'Tech', tenantId: 'tenant-1', role: 'tecnico' })
    const timeoutSpy = vi.spyOn(window, 'setTimeout')

    socketService.connect()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(timeoutSpy.mock.calls.filter(([, delay]) => delay === 15_000)).toHaveLength(1)

    socketMock.connected = true
    socketHandlers.get('connect')?.()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetch).toHaveBeenCalledTimes(1)

    socketMock.connected = false
    socketHandlers.get('disconnect')?.()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(timeoutSpy.mock.calls.filter(([, delay]) => delay === 15_000)).toHaveLength(2)
    socketService.disconnect()
  })

  it('keeps one timer and honors Retry-After instead of replacing it with 15 seconds', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'Retry-After': '60' } }))
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    const { useAuthStore } = await import('../../../../src/store/authStore')
    const { socketService } = await import('../../../../src/shared/services/socketService')
    useAuthStore.setState({ isAuthenticated: true, isAuthResolved: true, userId: 'tech-1', user: 'Tech', tenantId: 'tenant-1', role: 'tecnico' })
    const timeoutSpy = vi.spyOn(window, 'setTimeout')

    socketService.connect()
    await flushPromises()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(timeoutSpy.mock.calls.filter(([, delay]) => delay === 60_000)).toHaveLength(1)
    expect(timeoutSpy.mock.calls.filter(([, delay]) => delay === 15_000)).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(15_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(timeoutSpy.mock.calls.filter(([, delay]) => delay === 60_000)).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(45_000)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(timeoutSpy.mock.calls.filter(([, delay]) => delay === 15_000)).toHaveLength(1)
    socketService.disconnect()
  })

  it('does not restart fallback polling when intentional teardown emits disconnect synchronously', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    const { useAuthStore } = await import('../../../../src/store/authStore')
    const { socketService } = await import('../../../../src/shared/services/socketService')
    useAuthStore.setState({ isAuthenticated: true, isAuthResolved: true, userId: 'tech-1', user: 'Tech', tenantId: 'tenant-1', role: 'tecnico' })

    socketService.connect()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(0)
    socketMock.connected = true
    socketHandlers.get('connect')?.()
    expect(fetch).toHaveBeenCalledTimes(1)

    socketService.disconnect()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(socketMock.disconnect).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
